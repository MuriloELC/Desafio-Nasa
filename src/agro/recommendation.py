"""Published calendar rules and explainable, conservative field assessments."""

from datetime import date, timedelta
import math

from agro.cereja_data import PHASES, SEASON_MONTHS, UF, WATER, local_today

METHOD_VERSION = "cereja-regras-5"
MANDATORY_METRICS = ("air_temperature_c", "soil_ph", "recent_rain_mm", "seasonal_rain_mm")
FIELD_NAMES = {
    "age_years": "idade do café", "phase": "fase do café", "spacing_m": "espaçamento entre linhas",
    "water": "regime hídrico", "soil_ph": "pH medido em análise de solo",
    "can_manage": "capacidade de manejar a cobertura", "goal": "objetivo do manejo",
}
STRATEGIES = ("convencional", "permanente", "rotacao")
GOALS = ("conservar_agua", "reduzir_erosao", "produzir_biomassa", "simplificar_manejo")


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
              "water": option(raw.get("water"), WATER, "regime hídrico"),
              "strategy": option(raw.get("strategy"), STRATEGIES, "estratégia de entrelinha"),
              "goal": option(raw.get("goal"), GOALS, "objetivo do manejo")}
    for key, lo, hi in (("age_years", 0, 100), ("spacing_m", .01, 30), ("soil_ph", 0, 14)):
        fields[key] = None if raw.get(key) in (None, "") else number(raw[key], lo, hi)
    for key in ("can_manage",):
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


def evaluate(data, climate, fields, reference, municipality=None, regional_soil_ph=None):
    measurements = summarize_climate(climate)
    soil_ph = fields["soil_ph"] if fields["soil_ph"] is not None else regional_soil_ph
    effective_fields = fields | {"soil_ph": soil_ph}
    observed = {metric: item["value"] for metric, item in measurements.items()} | {"soil_ph": soil_ph}
    rules = applicable(data["rules"], phase=fields["phase"], water=fields["water"], municipality=municipality)
    candidates = []
    strategy = fields.get("strategy")
    for culture in data["cultures"]:
        if not culture.get("catalog_species"):
            continue
        cid = culture["culture_id"]
        life_cycle = (culture.get("life_cycle") or "").casefold()
        if strategy == "permanente" and "perene" not in life_cycle:
            continue
        if strategy == "rotacao" and "anual" not in life_cycle:
            continue
        if strategy == "convencional":
            continue
        selected = [rule for rule in rules if rule["culture_id"] == cid]
        missing = [label for key, label in FIELD_NAMES.items() if effective_fields.get(key) is None]
        reasons, sources = [], {}
        blocked, caution, failed_restrictions, warning_failures, evaluated_restrictions = False, False, 0, 0, 0
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
                if key not in FIELD_NAMES or fields.get(key) is None:
                    continue
                evaluated_restrictions += 1
                failed = (("equals" in check and fields[key] != check["equals"]) or
                          ("one_of" in check and fields[key] not in check["one_of"]) or
                          ("minimum" in check and fields[key] < check["minimum"]) or
                          ("maximum" in check and fields[key] > check["maximum"]))
                if failed:
                    is_blocking = check.get("severity") == "desfavoravel"
                    blocked |= is_blocking
                    failed_restrictions += int(is_blocking)
                    warning_failures += int(not is_blocking)
                    caution = True
                    reasons.append(check["reason"])
        if fields["can_manage"] is False:
            caution = True
            reasons.append("Não foi informada capacidade de manejar a cobertura regularmente.")
        for key, label in (("recent_rain_mm", "chuva recente"),
                           ("seasonal_rain_mm", "histórico com mês sazonal completo"),
                           ("air_temperature_c", "temperatura recente")):
            if key not in observed:
                missing.append(label)
        bands = {}
        for band in data["requirements"]:
            # Annual rain is contextual, never treated as a gate or a substitute for seasonal data.
            if band["culture_id"] == cid and band["metric"] != "annual_rain_mm":
                bands.setdefault((band["metric"], band["band"]), band)
        within_optimal = within_tolerated = outside_tolerated = evaluated_bands = 0
        for (metric, group), band in bands.items():
            detail = band["source_detail"]
            sources[(band["source"]["url"], detail, metric, group)] = {
                **band["source"], "detail": detail, "requirement_version": band["version"]}
            val = observed.get(metric)
            if val is None:
                continue
            evaluated_bands += 1
            if _out_of_band(val, band):
                blocked |= group == "tolerated"
                outside_tolerated += int(group == "tolerated")
                caution = True
                labels = {"soil_ph": "pH", "recent_rain_mm": "chuva recente",
                          "seasonal_rain_mm": "chuva sazonal", "air_temperature_c": "temperatura"}
                reasons.append(f"{labels[metric].capitalize()} fora da faixa {'tolerada' if group == 'tolerated' else 'ótima'} revisada.")
            elif group == "optimal":
                within_optimal += 1
            elif group == "tolerated":
                within_tolerated += 1
        missing_bands = set(MANDATORY_METRICS) - {metric for metric, group in bands if group == "optimal"}
        if missing_bands:
            missing.append("faixas agronômicas revisadas para a espécie")
        if not selected:
            missing.append("regra técnica revisada para esta fase e regime hídrico")
        failed_restrictions += outside_tolerated
        eligible = bool(selected) and not missing_bands
        # Sem a evidência mínima, nem mesmo um critério parcial pode criar posição distinta.
        # Entre espécies elegíveis, impedimentos documentados têm precedência.
        state = ("sem_dados" if not eligible else "desfavoravel" if blocked else "sem_dados" if missing else
                 "atencao" if caution else "favoravel")
        if not reasons:
            reasons.append("A avaliação usou os dados disponíveis; confira os itens pendentes abaixo." if missing
                           else "Os critérios de campo e os indicadores avaliados estão dentro das faixas publicadas.")
        coverage_required = len(FIELD_NAMES) + 3
        coverage_available = sum(effective_fields.get(key) is not None for key in FIELD_NAMES) + sum(key in observed for key in (
            "recent_rain_mm", "seasonal_rain_mm", "air_temperature_c"
        ))
        confidence = ("insuficiente" if not eligible else "alta" if coverage_available == coverage_required
                      else "media" if coverage_available >= math.ceil(coverage_required * .7) else "baixa")
        components = {
            "eligibility": {"applicable_rule": bool(selected),
                            "mandatory_bands_reviewed": len(MANDATORY_METRICS) - len(missing_bands),
                            "mandatory_bands_required": len(MANDATORY_METRICS)},
            "blocking_restrictions": {"failed": failed_restrictions, "warnings_failed": warning_failures,
                                      "evaluated": evaluated_restrictions},
            "range_adequacy": {"within_optimal": within_optimal, "within_tolerated": within_tolerated,
                               "outside_tolerated": outside_tolerated, "evaluated": evaluated_bands},
            "data_coverage": {"available": coverage_available, "required": coverage_required},
            "secondary": {"applicable_rules": len(selected), "documented_sources": len(sources)},
        }
        checked_fields = {check.get("field") for rule in selected for check in rule["checks"]}
        used_fields = {"phase", "water", "strategy", "can_manage"} | checked_fields
        if any(metric == "soil_ph" for metric, _ in bands):
            used_fields.add("soil_ph")
        data_used = [
            {"criterion": key, "value": value, "origin": "produtor"}
            for key, value in fields.items() if value is not None and key in used_fields
        ] + [
            {"criterion": key, "value": value, "origin": measurements[key]["source_id"]}
            for key, value in observed.items()
            if key != "soil_ph" and key in measurements and any(metric == key for metric, _ in bands)
        ]
        if fields["soil_ph"] is None and soil_ph is not None and any(metric == "soil_ph" for metric, _ in bands):
            data_used.append({"criterion": "soil_ph", "value": soil_ph, "origin": "SOILGRIDS"})
        candidates.append({"culture_id": cid, "name": culture["name"], "state": state, "missing": missing,
                           "reasons": list(dict.fromkeys(reasons)), "sources": list(sources.values()),
                           "rules_used": [{"rule_id": rule["rule_id"], "version": rule["version"]}
                                          for rule in selected],
                           "data_used": data_used, "score_components": components, "confidence": confidence,
                           "_eligible": eligible,
                           "_blocked": blocked})

    def ranking_key(item):
        # Restrições impeditivas precedem adequação, cobertura e critérios secundários.
        # Sem a evidência mínima, componentes parciais não criam uma ordem artificial.
        if not item["_eligible"]:
            return (1,)
        if item["_blocked"]:
            return (2,)
        score = item["score_components"]
        return (0, -score["range_adequacy"]["within_optimal"],
                -score["range_adequacy"]["within_tolerated"],
                score["range_adequacy"]["outside_tolerated"],
                score["blocking_restrictions"]["warnings_failed"],
                -score["data_coverage"]["available"],
                -score["secondary"]["applicable_rules"],
                -score["secondary"]["documented_sources"])

    ordered = sorted(candidates, key=lambda item: (ranking_key(item), item["name"].casefold()))
    groups = {}
    for item in ordered:
        groups.setdefault(ranking_key(item), []).append(item)
    dense_ranks = {key: rank for rank, key in enumerate(sorted(groups), 1)}
    for item in ordered:
        key = ranking_key(item)
        item["rank"] = dense_ranks[key]
        item["tie"] = len(groups[key]) > 1
        del item["_eligible"], item["_blocked"]
    ranking_available = len(groups) > 1 and any(
        item["score_components"]["eligibility"]["applicable_rule"] and
        item["score_components"]["eligibility"]["mandatory_bands_reviewed"] == len(MANDATORY_METRICS)
        for item in ordered
    )
    return {"method_version": METHOD_VERSION, "reference_date": reference, "strategy": strategy,
            "measurements": measurements, "coverage": climate,
            "ranking_available": ranking_available, "candidates": ordered}
