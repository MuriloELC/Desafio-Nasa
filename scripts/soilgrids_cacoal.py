"""Fetch the official SoilGrids 250 m mean layers for the Cacoal pilot.

Run inside the ETL image: docker compose run --rm --entrypoint python etl scripts/soilgrids_cacoal.py
Then import each verified file with `static-raster` (see docs/soilgrids_cacoal.md).
"""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import rasterio
import requests
from pyproj import Transformer

from agro.extractors.static_raster import means
from agro.grid import E, N, RADIUS_M, subcells


TARGET = Path("data/soilgrids")
CRS = "http://www.opengis.net/def/crs/EPSG/0/152160"
IGH = "+proj=igh +lat_0=0 +lon_0=0 +datum=WGS84 +units=m +no_defs"
LAYERS = {
    "phh2o": {"coverage": "phh2o_0-5cm_mean", "metric": "soil_ph", "unit": "pH", "scale": 0.1, "range": [2, 12]},
    "clay": {"coverage": "clay_0-5cm_mean", "metric": "clay_pct", "unit": "%", "scale": 0.1, "range": [0, 100]},
}


def fetch_layer(key, metadata, bounds):
    endpoint = "https://maps.isric.org/mapserv"
    params = [
        ("map", f"/map/{key}.map"), ("SERVICE", "WCS"), ("VERSION", "2.0.1"),
        ("REQUEST", "GetCoverage"), ("COVERAGEID", metadata["coverage"]),
        ("FORMAT", "GEOTIFF_INT16"),
        ("SUBSET", f"X({bounds[0]:.0f},{bounds[2]:.0f})"),
        ("SUBSET", f"Y({bounds[1]:.0f},{bounds[3]:.0f})"),
        ("SUBSETTINGCRS", CRS), ("OUTPUTCRS", CRS),
    ]
    response = requests.get(endpoint, params=params, timeout=(10, 120))
    response.raise_for_status()
    if response.content[:4] not in (b"II*\x00", b"MM\x00*"):
        raise ValueError(f"SoilGrids did not return a GeoTIFF for {key}: {response.text[:300]}")
    path = TARGET / f"{metadata['coverage']}_CACOAL_R20.tif"
    path.write_bytes(response.content)
    return path, response.url


def validate(path, metadata):
    with rasterio.open(path) as dataset:
        if not dataset.crs or dataset.count != 1 or not 150 <= abs(dataset.res[0]) <= 350:
            raise ValueError(f"Unexpected SoilGrids raster geometry: {path}")
        native = {"crs": str(dataset.crs), "resolution": list(dataset.res),
                  "width": dataset.width, "height": dataset.height, "nodata": dataset.nodata}
    values = dict(means(path))
    expected = {cell_id for cell_id, _ in subcells()}
    if set(values) != expected:
        raise ValueError(f"SoilGrids {metadata['coverage']} covers {len(values)}/{len(expected)} cells")
    lo, hi = metadata["range"]
    converted = [raw * metadata["scale"] for raw in values.values()]
    if any(not lo <= value <= hi for value in converted):
        raise ValueError(f"SoilGrids {metadata['coverage']} returned implausible values")
    return {**native, "cells_covered": len(values), "converted_min": min(converted),
            "converted_max": max(converted)}


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    transform = Transformer.from_crs(32720, IGH, always_xy=True)
    west, south, east, north = transform.transform_bounds(
        E - RADIUS_M, N - RADIUS_M, E + RADIUS_M, N + RADIUS_M, densify_pts=21)
    bounds = (west - 500, south - 500, east + 500, north + 500)
    manifest = {"product": "SoilGrids 2.0", "prediction": "mean", "depth_cm": [0, 5],
                "native_resolution_m": 250, "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
                "area": "CACOAL_R20", "license": "CC BY 4.0", "layers": {}}
    for key, metadata in LAYERS.items():
        path, url = fetch_layer(key, metadata, bounds)
        details = validate(path, metadata)
        manifest["layers"][key] = {**metadata, **details, "url": url,
                                   "path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        print(f"{key}: {details['cells_covered']} cells, {details['converted_min']:.2f}–{details['converted_max']:.2f} {metadata['unit']}")
    (TARGET / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(TARGET / "manifest.json")


if __name__ == "__main__":
    main()
