from datetime import date
from io import StringIO
from threading import Thread
from urllib.error import HTTPError
from urllib.request import urlopen
import csv
import json

import pytest

from agro.catalog import read_catalog, CSV_PATH
from agro.recommendation import applicable, assessment_inputs, calendar_payload, evaluate, summarize_climate
from agro.web import Service, make_server


def rule(id="sazonal", **changes):
    return {"rule_id": id, "version": 1, "culture_id": "milheto", "kind": "sazonal", "activity": "plantio",
            "uf": "RO", "municipality": None, "phase": "formacao", "water": "sequeiro", "start_month": 10,
            "end_month": 3, "orientation": "Texto de teste", "source_detail": "p. 1", "checks": [],
            "source": {"url": "https://example.org/", "title": "Apenas para teste"}} | changes


CULTURE = {"culture_id": "milheto", "name": "Milheto", "kind": "entrelinha", "catalog_species": True}


def test_catalog_only_contains_actual_draft_evidence(tmp_path):
    cultures, bands = read_catalog()
    assert len(cultures) == len({c["culture_id"] for c in cultures}) == 10
    assert len(bands) == 30 and {b["band"] for b in bands} == {"optimal"}
    assert {b["unit"] for b in bands} == {"C", "pH", "mm"}
    assert next(c for c in cultures if c["culture_id"] == "guandu-anao")["scientific_name"] == "Cajanus cajan"

    bad = tmp_path/"bad.csv"
    rows = list(csv.reader(StringIO(CSV_PATH.read_text(encoding="utf-8-sig")), delimiter=";"))
    rows[1][rows[0].index("soil_ph_min")] = ""
    with bad.open("w", encoding="utf-8", newline="") as file:
        csv.writer(file,delimiter=";").writerows(rows)
    assert read_catalog(bad)[1][2]["minimum"] is None
    rows[1][rows[0].index("soil_ph_min")] = "10"
    with bad.open("w", encoding="utf-8", newline="") as file:
        csv.writer(file,delimiter=";").writerows(rows)
    with pytest.raises(ValueError, match="Faixa inválida"):
        read_catalog(bad)


def test_calendar_keeps_two_windows_and_projects_across_year():
    rules = [rule(), rule("second", start_month=7, end_month=8),
             rule("days", kind="apos_plantio", activity="corte", start_day=90, end_day=105),
             rule("monitor", kind="condicional", activity="monitoramento")]
    data = {"cultures":[CULTURE], "rules":rules}
    params = {"safra":2020, "cultura":"milheto", "fase":"formacao", "agua":"sequeiro"}
    raw = {r["rule_id"]: r for r in calendar_payload(data, params | {"plantio":"2020-12-28"})["rules"]}
    assert raw["sazonal"]["months"] == [10,11,12,1,2,3]
    assert raw["second"]["months"] == [7,8]
    assert raw["monitor"]["months"] == []
    assert raw["days"]["starts_on"] == date(2021,3,28)
    assert raw["days"]["months"] == [3,4]
    assert not next(r for r in calendar_payload(data, params)["rules"] if r["rule_id"]=="days")["months"]
    assert not calendar_payload(data, params | {"agua":"irrigado"})["rules"]


def test_calendar_respects_scope_and_phase():
    municipality = rule("local", municipality="1100049")
    regional = rule("regional")
    generic = rule("general", uf=None)
    other = rule("other", phase="recepa")
    assert applicable([generic,other,municipality,regional], phase="formacao",water="sequeiro",municipality="1100049") == [municipality]
    assert applicable([generic,other,municipality,regional], phase="formacao",water="sequeiro",municipality="1100189") == [regional]
    assert applicable([generic,other,municipality,regional], phase="recepa",water="sequeiro") == [other]
    assert not applicable([municipality], phase="formacao",water="irrigado")
    assert not applicable([municipality])


def observation(source, metric, kind, value, available=30, expected=30):
    return {"source_id":source,"metric":metric,"kind":kind,"value":value,"days_expected":expected,"days_available":available}


def test_incomplete_series_are_visible_but_not_merged():
    records = [observation("POWER","precip_power_mm","recent",60),
               observation("IMERG_FINAL","precip_mm","recent",72,29),
               observation("POWER","precip_power_mm","seasonal",100),
               observation("POWER","precip_power_mm","seasonal",110),
               observation("IMERG_FINAL","precip_mm","seasonal",120)]
    result = summarize_climate(records)
    assert result["recent_rain_mm"] == {"value":60,"source_id":"POWER","period_count":1}
    assert result["seasonal_rain_mm"] == {"value":105,"source_id":"POWER","period_count":2}
    assert "air_temperature_c" not in result


def test_recommendation_gates_positive_result_and_prioritizes_field_restrictions():
    fields = {"phase":"formacao","water":"sequeiro","goal":"produzir_biomassa","soil_ph":6,"age_years":1,"spacing_m":3,
              "can_manage":True}
    climate = [observation("POWER","precip_power_mm","recent",60),observation("POWER","precip_power_mm","seasonal",100),
               observation("POWER","temp_mean_c","recent",25)]
    req = [{"culture_id":"milheto","metric":m,"band":"optimal","minimum":lo,"maximum":hi,
            "source_detail":"p. 3","source":{"url":"https://example.org/"},"version":"test-only"}
           for m,lo,hi in [("air_temperature_c",20,30),("soil_ph",5,7),("recent_rain_mm",50,70),
                           ("seasonal_rain_mm",80,120),("annual_rain_mm",1000,1200)]]
    selected = rule(checks=[{"field":"spacing_m", "minimum":2, "severity":"desfavoravel", "reason":"Espaçamento incompatível."}])
    data = {"cultures":[CULTURE],"requirements":req,"rules":[selected]}
    ref = date(2020,11,30)
    favorable = evaluate(data,climate,fields,ref)
    assert favorable["method_version"] == "cereja-regras-5"
    assert favorable["candidates"][0]["state"] == "favoravel"
    assert favorable["candidates"][0]["rank"] == 1
    assert favorable["candidates"][0]["confidence"] == "alta"
    assert favorable["candidates"][0]["score_components"]["range_adequacy"]["within_optimal"] == 4
    assert favorable["candidates"][0]["rules_used"] == [{"rule_id":"sazonal","version":1}]
    assert {item["criterion"] for item in favorable["candidates"][0]["data_used"]} >= {
        "soil_ph", "recent_rain_mm", "seasonal_rain_mm", "air_temperature_c"}
    missing = evaluate(data,climate,fields | {"soil_ph":None},ref)["candidates"][0]
    assert missing["state"] == "sem_dados" and "pH medido em análise de solo" in missing["missing"]
    regional = evaluate(data,climate,fields | {"soil_ph":None},ref,regional_soil_ph=5.8)["candidates"][0]
    assert regional["state"] == "favoravel" and not regional["missing"]
    assert {"criterion":"soil_ph","value":5.8,"origin":"SOILGRIDS"} in regional["data_used"]
    blocked = evaluate(data,[],fields | {"spacing_m":1},ref)["candidates"][0]
    assert blocked["state"] == "desfavoravel" and "Espaçamento incompatível." in blocked["reasons"]
    assert evaluate(data,climate,fields,date(2021,8,31))["candidates"][0]["state"] == "atencao"
    assert evaluate(data | {"requirements":[]},climate,fields,ref)["candidates"][0]["state"] == "sem_dados"


def test_unreviewed_candidates_remain_an_explicit_real_tie():
    fields = {"phase":"formacao","water":"sequeiro","goal":"produzir_biomassa","soil_ph":6,"age_years":1,"spacing_m":3,
              "can_manage":False}
    cultures = [CULTURE, CULTURE | {"culture_id":"amendoim", "name":"Amendoim"},
                CULTURE | {"culture_id":"guandu", "name":"Guandu"}]
    result = evaluate({"cultures":cultures,"requirements":[],"rules":[]}, [], fields, date(2020,11,30))
    assert not result["ranking_available"]
    assert [item["name"] for item in result["candidates"]] == ["Amendoim", "Guandu", "Milheto"]
    assert {item["state"] for item in result["candidates"]} == {"sem_dados"}
    assert {item["rank"] for item in result["candidates"]} == {1}
    assert all(item["tie"] and item["confidence"] == "insuficiente" for item in result["candidates"])
    partial_rule = rule(checks=[{"field":"spacing_m", "minimum":4, "severity":"desfavoravel",
                                "reason":"Espaçamento incompatível."}])
    partial = evaluate({"cultures":cultures,"requirements":[],"rules":[partial_rule]}, [], fields,
                       date(2020,11,30))
    assert {item["state"] for item in partial["candidates"]} == {"sem_dados"}
    assert {item["rank"] for item in partial["candidates"]} == {1}


def test_ranking_only_differentiates_species_with_minimum_evidence():
    fields = {"phase":"formacao","water":"sequeiro","goal":"produzir_biomassa","soil_ph":6,"age_years":1,"spacing_m":3,
              "can_manage":True}
    climate = [observation("POWER","precip_power_mm","recent",60),
               observation("POWER","precip_power_mm","seasonal",100),
               observation("POWER","temp_mean_c","recent",25)]
    req = [{"culture_id":"milheto","metric":metric,"band":"optimal","minimum":minimum,"maximum":maximum,
            "source_detail":"p. 3","source":{"url":"https://example.org/"},"version":"reviewed-test"}
           for metric,minimum,maximum in (("air_temperature_c",20,30),("soil_ph",5,7),
                                          ("recent_rain_mm",50,70),("seasonal_rain_mm",80,120))]
    cultures = [CULTURE, CULTURE | {"culture_id":"guandu", "name":"Guandu"}]
    result = evaluate({"cultures":cultures,"requirements":req,"rules":[rule()]}, climate, fields, date(2020,11,30))
    assert result["ranking_available"]
    assert [(item["culture_id"],item["rank"],item["tie"]) for item in result["candidates"]] == [
        ("milheto",1,False),("guandu",2,False)]


def test_management_goal_changes_secondary_ranking():
    fields = {"phase":"formacao","water":"sequeiro","goal":"produzir_biomassa","soil_ph":6,
              "age_years":1,"spacing_m":3,"can_manage":True}
    climate = [observation("POWER","precip_power_mm","recent",60),
               observation("POWER","precip_power_mm","seasonal",100),
               observation("POWER","temp_mean_c","recent",25)]
    cultures = [CULTURE, CULTURE | {"culture_id":"guandu", "name":"Guandu"}]
    req = [{"culture_id":cid,"metric":metric,"band":"optimal","minimum":minimum,"maximum":maximum,
            "source_detail":"p. 3","source":{"url":"https://example.org/"},"version":"reviewed-test"}
           for cid in ("milheto","guandu")
           for metric,minimum,maximum in (("air_temperature_c",20,30),("soil_ph",5,7),
                                          ("recent_rain_mm",50,70),("seasonal_rain_mm",80,120))]
    biomass = {"field":"goal","one_of":["produzir_biomassa"],"severity":"atencao","reason":"Objetivo diferente."}
    water = {"field":"goal","one_of":["conservar_agua"],"severity":"atencao","reason":"Objetivo diferente."}
    rules = [rule(checks=[biomass]), rule("guandu-rule",culture_id="guandu",checks=[water])]
    result = evaluate({"cultures":cultures,"requirements":req,"rules":rules},climate,fields,date(2020,11,30))
    assert [(item["culture_id"],item["rank"]) for item in result["candidates"]] == [("milheto",1),("guandu",2)]


def test_invalid_inputs_and_coordinates_outside():
    with pytest.raises(ValueError):
        assessment_inputs({"field":{"can_manage":"false"}})
    _, legacy = assessment_inputs({"field":{"nematodes":True}})
    assert "nematodes" not in legacy
    with pytest.raises(ValueError):
        Service(None).recommendation({"lat":"NaN","lon":-61.4})

    class NoCoverage:
        def locate(self, lat, lon):
            return {"inside":False,"cell_id":None}

    result = Service(NoCoverage()).recommendation({"lat":11,"lon":20})
    assert not result["inside"] and not result["candidates"]


def test_http_reports_unavailable_database_without_internal_details():
    class NoDatabase:
        def diagnosis(self, *args):
            raise RuntimeError("private connection details")

    with make_server(("127.0.0.1",0), Service(NoDatabase())) as server:
        thread = Thread(target=server.serve_forever,daemon=True)
        thread.start()
        try:
            with pytest.raises(HTTPError) as caught:
                urlopen(f"http://127.0.0.1:{server.server_port}/api/consulta?lat=-11&lon=-61",timeout=3)
            with caught.value as response:
                assert response.code == 503
                assert "private connection" not in json.load(response)["error"]
        finally:
            server.shutdown()
            thread.join()
