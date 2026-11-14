"""Published calendar rules and explainable, conservative field assessments."""

from datetime import date, timedelta
import math

from agro.cereja_data import PHASES, SEASON_MONTHS, UF, WATER, local_today

METHOD_VERSION = "cereja-regras-1"
FIELD_NAMES = {
    "age_years": "idade do café", "phase": "fase do café", "spacing_m": "espaçamento entre linhas",
    "water": "regime hídrico", "soil_ph": "pH medido em análise de solo",
    "nematodes": "histórico de nematoides", "can_manage": "capacidade de manejar a cobertura",
    "soil_assessed": "avaliação da fertilidade do solo", "moisture_checked": "verificação da umidade em campo",
}


def number(value, low, high):
    try:
        if isinstance(value, bool) or not isinstance(value, (str, int, float)):
            raise ValueError
        value = float(value)
        if not math.isfinite(value) or not low <= value <= high:
            raise ValueError
        return value
    except (ValueError, TypeError, OverflowError):
        raise ValueError("Informe números dentro dos limites indicados.") from None


def coordinate(data):
    return number(data.get("lat"), -90, 90), number(data.get("lon"), -180, 180)


def option(value, options, label):
    if value in (None, ""):
        return None
    if value not in options:
        raise ValueError(f"Valor inválido: {label}.")
    return value


def parse_day(value, label):
    try:
        if not isinstance(value, str) or len(value) != 10:
            raise ValueError
        return date.fromisoformat(value)
    except ValueError:
        raise ValueError(f"Data inválida: {label}. Use AAAA-MM-DD.") from None


def assessment_inputs(payload):
    raw = payload.get("field", {})
    if not isinstance(raw, dict):
        raise ValueError("Os dados de campo precisam ser um objeto.")
    today = local_today()
    reference = parse_day(payload["reference_date"], "data de referência") if payload.get("reference_date") else today
    if not date(2000, 1, 1) <= reference <= today:
        raise ValueError("A data de referência deve estar entre 2000 e hoje.")
    fields = {"phase": option(raw.get("phase"), PHASES, "fase"),
              "water": option(raw.get("water"), WATER, "regime hídrico")}
    for key, lo, hi in (("age_years", 0, 100), ("spacing_m", .01, 30), ("soil_ph", 0, 14)):
        fields[key] = None if raw.get(key) in (None, "") else number(raw[key], lo, hi)
    for key in ("nematodes", "can_manage", "soil_assessed", "moisture_checked"):
        value = raw.get(key)
        if value is not None and not isinstance(value, bool):
            raise ValueError(f"Informe sim, não ou desconhecido: {FIELD_NAMES[key]}.")
        fields[key] = value
    return reference, fields


def applicable(rules, *, culture=None, phase=None, water=None, municipality=None, overview=False):
    """Prefer locality, then exact phase and water, retaining separate peer windows."""
    groups = {}
    for rule in rules:
        rp, rw = rule["phase"], rule["water"]
        if culture and culture != rule["culture_id"]:
            continue
        if rule["uf"] not in (None, UF) or rule["municipality"] not in (None, municipality):
            continue
        if (phase and rp not in ("qualquer", phase)) or (not phase and not overview and rp != "qualquer"):
            continue
        if (water and rw not in ("ambos", water)) or (not water and not overview and rw != "ambos"):
            continue
        bucket = (rule["culture_id"], rule["activity"],
                  rp if overview and not phase else None, rw if overview and not water else None)
        rank = (2 if rule["municipality"] else int(rule["uf"] is not None),
                bool(phase and phase == rp), bool(water and water == rw))
        if bucket not in groups or rank > groups[bucket][0]:
            groups[bucket] = rank, [rule]
        elif rank == groups[bucket][0]:
            groups[bucket][1].append(rule)
    return [row for _, entries in groups.values() for row in entries]


def seasonal_months(start, end):
    return [m for m in SEASON_MONTHS if (start <= m <= end if start <= end else m >= start or m <= end)]


def calendar_payload(data, params):
    today = local_today()
    season = today.year - (today.month < 10)
    try:
        year = int(params.get("safra", season))
        if not 2000 <= year <= today.year + 5:
            raise ValueError
    except (ValueError, TypeError):
        raise ValueError("Safra inválida.") from None
    phase = option(params.get("fase"), PHASES, "fase")
    water = option(params.get("agua"), WATER, "regime hídrico")
    culture = option(params.get("cultura"), tuple(row["culture_id"] for row in data["cultures"]), "cultura")
    planted = parse_day(params["plantio"], "plantio") if params.get("plantio") else None
    if planted and (not culture or not date(2000, 1, 1) <= planted <= today):
        raise ValueError("Selecione uma cultura e informe uma data de plantio real entre 2000 e hoje.")
    bounds = date(year, 10, 1), date(year + 1, 10, 1) - timedelta(days=1)
    windows = []
    for row in applicable(data["rules"], culture=culture, phase=phase, water=water,
                          municipality=params.get("municipio"), overview=True):
        start, end, months = None, None, []
        if row["kind"] == "sazonal":
            months = seasonal_months(row["start_month"], row["end_month"])
        elif row["kind"] == "apos_plantio" and planted:
            start, end = (planted + timedelta(days=row[k]) for k in ("start_day", "end_day"))
            for m in SEASON_MONTHS:
                first = date(year + (m < 10), m, 1)
                last = date(first.year + (m == 12), m % 12 + 1, 1) - timedelta(days=1)
                if first <= end and last >= start:
                    months.append(m)
        windows.append({key: row.get(key) for key in (
            "rule_id", "version", "culture_id", "activity", "kind", "phase", "water", "uf",
            "municipality", "orientation", "source", "source_detail"
        )} | {"months": months, "starts_on": start, "ends_on": end})
    return {"year": year, "months": SEASON_MONTHS, "today_month": today.month if bounds[0] <= today <= bounds[1] else None,
            "cultures": [{k: row[k] for k in ("culture_id", "name", "kind")} for row in data["cultures"]],
            "rules": windows}


def summarize_climate(rows):
    """Only use complete periods and never combine precipitation products."""
    complete = [row for row in rows if row["days_available"] == row["days_expected"] and row["value"] is not None]
    groups = {}
    for row in complete:
        if row["metric"] == "temp_mean_c":
            groups.setdefault(("air_temperature_c", row["source_id"]), []).append(row)
        else:
            key = "recent_rain_mm" if row["kind"] == "recent" else "seasonal_rain_mm"
            groups.setdefault((key, row["source_id"]), []).append(row)
    measurements = {}
    for metric in ("recent_rain_mm", "seasonal_rain_mm", "air_temperature_c"):
        source = max(("POWER", "IMERG_FINAL"), key=lambda s: (len(groups.get((metric, s), [])), s == "IMERG_FINAL"))
        periods = groups.get((metric, source), [])
        if periods:
            measurements[metric] = {"value": sum(item["value"] for item in periods)/len(periods),
                "source_id": source, "period_count": len(periods)}
    return measurements


def _out_of_band(value, band):
    return ((band["minimum"] is not None and value < band["minimum"]) or
            (band["maximum"] is not None and value > band["maximum"]))


def evaluate(data, climate, fields, reference, municipality=None):
    measurements = summarize_climate(climate)
    observed = {metric: item["value"] for metric, item in measurements.items()} | {"soil_ph": fields["soil_ph"]}
    rules = applicable(data["rules"], phase=fields["phase"], water=fields["water"], municipality=municipality)
    candidates = []
    for culture in data["cultures"]:
        if not culture.get("catalog_species"):
            continue
        cid = culture["culture_id"]
        selected = [rule for rule in rules if rule["culture_id"] == cid]
        missing = [label for key, label in FIELD_NAMES.items() if fields[key] is None or (
            key in ("soil_assessed", "moisture_checked") and not fields[key]
        )]
        reasons, sources = [], {}
        blocked, caution = False, False
        for rule in selected:
            source = {**rule["source"], "detail": rule["source_detail"], "rule_id": rule["rule_id"], "rule_version": rule["version"]}
            sources[(source["url"], source["detail"], rule["rule_id"])] = source
            if rule["kind"] == "sazonal" and rule["activity"] == "plantio" and not any(
                r["activity"] == "plantio" and r["kind"] == "sazonal" and
                reference.month in seasonal_months(r["start_month"], r["end_month"]) for r in selected
            ):
                caution = True
                reasons.append("O mês de referência está fora das janelas técnicas de plantio aplicáveis.")
            for check in rule["checks"]:
                key = check.get("field")
                if key not in FIELD_NAMES or fields[key] is None:
                    continue
                failed = (("equals" in check and fields[key] != check["equals"]) or
                          ("minimum" in check and fields[key] < check["minimum"]) or
                          ("maximum" in check and fields[key] > check["maximum"]))
                if failed:
                    blocked |= check.get("severity") == "desfavoravel"
                    caution = True
                    reasons.append(check["reason"])
        if fields["can_manage"] is False:
            caution = True
            reasons.append("Não foi informada capacidade de manejar a cobertura regularmente.")
        if fields["nematodes"] is True:
            caution = True
            reasons.append("Confirme com assistência técnica a identificação do nematoide e a compatibilidade da espécie.")
        for key, label in (("recent_rain_mm", "chuva dos últimos 30 dias em série completa"),
                           ("seasonal_rain_mm", "histórico com mês sazonal completo"),
                           ("air_temperature_c", "temperatura dos últimos 30 dias em série completa")):
            if key not in observed:
                missing.append(label)
        bands = {}
        for band in data["requirements"]:
            # Annual rain is contextual, never treated as a gate or a substitute for seasonal data.
            if band["culture_id"] == cid and band["metric"] != "annual_rain_mm":
                bands.setdefault((band["metric"], band["band"]), band)
        for (metric, group), band in bands.items():
            val = observed.get(metric)
            if val is None:
                continue
            detail = band["source_detail"]
            sources[(band["source"]["url"], detail, metric, group)] = {
                **band["source"], "detail": detail, "requirement_version": band["version"]}
            if _out_of_band(val, band):
                blocked |= group == "tolerated"
                caution = True
                labels = {"soil_ph": "pH", "recent_rain_mm": "chuva recente",
                          "seasonal_rain_mm": "chuva sazonal", "air_temperature_c": "temperatura"}
                reasons.append(f"{labels[metric].capitalize()} fora da faixa {'tolerada' if group == 'tolerated' else 'ótima'} revisada.")
        missing_bands = {"soil_ph", "recent_rain_mm", "seasonal_rain_mm", "air_temperature_c"} - {metric for metric, _ in bands}
        if missing_bands:
            missing.append("faixas agronômicas revisadas para a espécie")
        if not selected:
            missing.append("regra técnica revisada para esta fase e regime hídrico")
        state = ("desfavoravel" if blocked else "atencao" if caution else
                 "sem_dados" if missing else "favoravel")
        if not reasons:
            reasons.append("Faltam dados ou critérios revisados para concluir a avaliação." if missing
                           else "Os critérios de campo e os indicadores avaliados estão dentro das faixas revisadas.")
        candidates.append({"culture_id": cid, "name": culture["name"], "state": state, "missing": missing,
                           "reasons": list(dict.fromkeys(reasons)), "sources": list(sources.values())})
    ranking = {"favoravel": 0, "atencao": 1, "sem_dados": 2, "desfavoravel": 3}
    return {"method_version": METHOD_VERSION, "reference_date": reference,
            "measurements": measurements, "coverage": climate,
            "candidates": sorted(candidates, key=lambda item: (ranking[item["state"]], item["name"].casefold()))}
