"""Import the actual project CSV as draft evidence, leaving reviewed data alone."""

import argparse
import csv
import json
import math
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parents[2] / "docs/cultivo-entrelinha/catalogo_entrelinhas_cafe_limpo.csv"
VERSION = "catalogo-limpo-2026-11-14"
IDENTITIES = {
    "Amendoim-forrageiro": ("amendoim-forrageiro", "Arachis pintoi"),
    "Mucuna-anã": ("mucuna-ana", None),
    "Crotalária-spectabilis": ("crot-spectabilis", "Crotalaria spectabilis"),
    "Feijão-de-porco": ("feijao-de-porco", "Canavalia ensiformis"),
    "Crotalária-júncea": ("crot-juncea", "Crotalaria juncea"),
    "Guandu-anão": ("guandu-anao", None),
    "Milheto": ("milheto", "Cenchrus americanus"),
    "Braquiária-ruziziensis": ("braquiaria-ruziziensis", "Urochloa ruziziensis"),
    "Lablab": ("lablab", "Lablab purpureus"),
    "Feijão-caupi": ("feijao-caupi", "Vigna unguiculata"),
}
BANDS = {
    "air_temperature_c": ("C", "temp_min_ideal_c", "temp_max_ideal_c"),
    "annual_rain_mm": ("mm", "rain_annual_min_mm", "rain_annual_max_mm"),
    "soil_ph": ("pH", "soil_ph_min", "soil_ph_max"),
}


def read_catalog(path=CSV_PATH):
    with Path(path).open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file, delimiter=";")
        expected = {"nome_da_especie", "life_cycle", "benefits", "fixes_nitrogen",
                    "drought_tolerance_qualitative", "shade_tolerance_qualitative",
                    "competition_risk_qualitative", "management_guidance"}
        expected.update(column for _, low, high in BANDS.values() for column in (low, high))
        if not expected.issubset(reader.fieldnames or []):
            raise ValueError("O CSV não contém todas as colunas necessárias.")
        rows = list(reader)
    if sorted(row["nome_da_especie"] for row in rows) != sorted(IDENTITIES):
        raise ValueError("O CSV deve conter as dez espécies esperadas, sem duplicatas.")
    cultures, requirements = [], []
    for row in rows:
        name = row["nome_da_especie"]
        cid, scientific_name = IDENTITIES[name]
        notes = {key: row[key] or None for key in (
            "benefits", "fixes_nitrogen", "drought_tolerance_qualitative", "shade_tolerance_qualitative",
            "competition_risk_qualitative", "management_guidance")}
        cultures.append({"culture_id": cid, "name": name, "scientific_name": scientific_name,
                         "life_cycle": row["life_cycle"], "notes": notes, "import_version": VERSION})
        for metric, (unit, low, high) in BANDS.items():
            lo, hi = (float(row[column]) if row[column] and row[column].strip() else None for column in (low, high))
            if any(v is not None and not math.isfinite(v) for v in (lo, hi)) or (
                lo is not None and hi is not None and lo > hi
            ) or (metric == "soil_ph" and any(v is not None and not 0 <= v <= 14 for v in (lo, hi))) or (
                metric == "annual_rain_mm" and any(v is not None and v < 0 for v in (lo, hi))
            ):
                raise ValueError(f"Faixa inválida: {cid} / {metric}")
            requirements.append({"culture_id": cid, "metric": metric, "band": "optimal",
                                 "unit": unit, "minimum": lo, "maximum": hi, "version": VERSION})
    return cultures, requirements


def import_catalog(conn, cultures, requirements, apply=False):
    from psycopg.types.json import Jsonb

    report = {"version": VERSION, "mode": "apply" if apply else "dry-run", "cultures": [], "requirements": []}
    with conn.transaction():
        if apply:
            conn.execute("SELECT pg_advisory_xact_lock(hashtext('cereja-catalog-import'))")
        else:
            conn.execute("SET TRANSACTION READ ONLY")
        existing_cultures = {r["culture_id"]: r for r in conn.execute(
            "SELECT culture_id,name,scientific_name,life_cycle,notes,import_version,catalog_species "
            "FROM agro.cereja_cultures WHERE culture_id = ANY(%s)", ([r["culture_id"] for r in cultures],))}
        existing_bands = {(r["culture_id"], r["metric"], r["band"]): r for r in conn.execute(
            "SELECT culture_id,metric,band,unit,minimum,maximum,version,reviewed FROM agro.cereja_requirements "
            "WHERE version = %s", (VERSION,))}
        for culture in cultures:
            old = existing_cultures.get(culture["culture_id"])
            desired = {**culture, "catalog_species": True}
            if old and old["scientific_name"]:
                desired["scientific_name"] = old["scientific_name"]
            if old == desired:
                continue
            report["cultures"].append({"before": old, "after": desired})
            if apply:
                conn.execute("""
                    INSERT INTO agro.cereja_cultures
                        (culture_id,name,scientific_name,kind,catalog_species,life_cycle,notes,import_version)
                    VALUES (%(culture_id)s,%(name)s,%(scientific_name)s,'entrelinha',true,
                            %(life_cycle)s,%(notes)s,%(import_version)s)
                    ON CONFLICT (culture_id) DO UPDATE SET name=excluded.name, catalog_species=true,
                    scientific_name=COALESCE(agro.cereja_cultures.scientific_name, excluded.scientific_name),
                    life_cycle=excluded.life_cycle, notes=excluded.notes, import_version=excluded.import_version
                    """, {**culture, "notes": Jsonb(culture["notes"])})
        for item in requirements:
            desired = {**item, "reviewed": False}
            old = existing_bands.get((item["culture_id"], item["metric"], item["band"]))
            if old == desired or (old and old["reviewed"]):
                continue
            report["requirements"].append({"before": old, "after": desired})
            if apply:
                conn.execute("""
                    INSERT INTO agro.cereja_requirements (culture_id,metric,band,unit,minimum,maximum,version)
                    VALUES (%(culture_id)s,%(metric)s,%(band)s,%(unit)s,%(minimum)s,%(maximum)s,%(version)s)
                    ON CONFLICT (culture_id,metric,band,version) DO UPDATE
                    SET unit=excluded.unit, minimum=excluded.minimum, maximum=excluded.maximum
                    WHERE NOT agro.cereja_requirements.reviewed
                    """, item)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=CSV_PATH)
    parser.add_argument("--apply", action="store_true", help="Aplica a carga; sem a flag, apenas exibe o diff.")
    args = parser.parse_args()
    cultures, requirements = read_catalog(args.csv)
    from agro.db import connect
    with connect() as conn:
        report = import_catalog(conn, cultures, requirements, apply=args.apply)
    print(json.dumps(report, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
