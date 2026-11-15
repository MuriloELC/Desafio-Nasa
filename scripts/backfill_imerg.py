"""Resume a mapped IMERG history without retaining thousands of global ZIPs."""
import argparse
import csv
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path
import requests

from agro.config import env
from agro.db import connect
from agro.grid import REGION_ID
from agro.extractors.imerg import load, extract_total_tif_remote


def prepare(day, filename):
    with requests.Session() as session:
        session.auth = (env('PPS_USERNAME', required=True),
                        env('PPS_PASSWORD', required=True))
        return extract_total_tif_remote(session, day, filename)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--limit', type=int, default=0, help='Maximum new days; 0 means all')
    parser.add_argument('--workers', type=int, default=6)
    parser.add_argument('--start', type=date.fromisoformat,
                        help='First date to load from the manifest')
    parser.add_argument('--end', type=date.fromisoformat,
                        help='Last date to load from the manifest')
    parser.add_argument('--failures-output', type=Path,
                        default=Path('/app/data/imerg_backfill_failures.csv'))
    parser.add_argument('--archive-raw', action='store_true',
                        help='Store every global ZIP in Supabase Storage')
    args = parser.parse_args()
    if (not 1 <= args.workers <= 12 or args.limit < 0
            or args.start and args.end and args.start > args.end):
        parser.error('Require 1 <= workers <= 12, limit >= 0 and start <= end')
    with args.manifest.open(newline='', encoding='utf-8') as file:
        manifest = list(csv.DictReader(file))
    if any(row['status'] == 'error' for row in manifest):
        parser.error('Manifest has request errors; map it again before backfill')
    available = [(date.fromisoformat(row['date']), row['filename'])
                 for row in manifest if row['status'] == 'available'
                 and (args.start is None or date.fromisoformat(row['date']) >= args.start)
                 and (args.end is None or date.fromisoformat(row['date']) <= args.end)]
    failures = []
    loaded = 0
    with connect() as conn:
        done = {row['period_start'] for row in conn.execute('''
            SELECT DISTINCT period_start FROM agro.etl_runs
            WHERE command='imerg_daily' AND status='succeeded' AND region_id=%s ''',
            (REGION_ID,)).fetchall()}
    pending = [(day, filename) for day, filename in available if day not in done]
    if args.limit:
        pending = pending[:args.limit]

    def ingest_one(day, filename):
        """Prepare and ingest one day with a connection owned by this worker."""
        prepared_path = None
        try:
            if not args.archive_raw:
                prepared_path = prepare(day, filename)
            with connect() as conn:
                count = load(conn, day, archive_raw=args.archive_raw,
                             cleanup=True, filename=filename,
                             prepared_path=prepared_path)
            return day, count, None
        except Exception as error:
            return day, 0, error

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(ingest_one, day, filename): (day, filename)
                   for day, filename in pending}
        for future in as_completed(futures):
            day, count, error = future.result()
            if error is None:
                loaded += 1
                print(f'{day}: {count} cells', flush=True)
            else:
                failures.append((day.isoformat(), type(error).__name__, str(error)[:200]))
                print(f'{day}: FAILED {type(error).__name__}: {error}', flush=True)
    output = args.failures_output
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(('date', 'error_type', 'message'))
        writer.writerows(failures)
    print(f'Loaded {loaded} new days; {len(failures)} failures. Report: {output}', flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
