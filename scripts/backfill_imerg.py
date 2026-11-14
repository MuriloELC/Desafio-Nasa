"""Resume a mapped IMERG history without retaining thousands of global ZIPs."""
import argparse
import csv
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path
import requests

from agro.config import env
from agro.db import connect
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
    parser.add_argument('--archive-raw', action='store_true',
                        help='Store every global ZIP in Supabase Storage')
    args = parser.parse_args()
    if not 1 <= args.workers <= 12 or args.limit < 0:
        parser.error('Require 1 <= workers <= 12 and limit >= 0')
    with args.manifest.open(newline='', encoding='utf-8') as file:
        manifest = list(csv.DictReader(file))
    if any(row['status'] == 'error' for row in manifest):
        parser.error('Manifest has request errors; map it again before backfill')
    available = [(date.fromisoformat(row['date']), row['filename'])
                 for row in manifest if row['status'] == 'available']
    failures = []
    loaded = 0
    consecutive_failures = 0
    with connect() as conn:
        done = {row['period_start'] for row in conn.execute('''
            SELECT DISTINCT period_start FROM agro.etl_runs
            WHERE command='imerg_daily' AND status='succeeded' ''').fetchall()}
        pending = [(day, filename) for day, filename in available if day not in done]
        if args.limit:
            pending = pending[:args.limit]

        def ingest(day, filename, prepared_path=None):
            nonlocal loaded, consecutive_failures
            try:
                count = load(conn, day, archive_raw=args.archive_raw,
                             cleanup=True, filename=filename,
                             prepared_path=prepared_path)
                loaded += 1
                consecutive_failures = 0
                print(f'{day}: {count} cells', flush=True)
            except Exception as error:
                failures.append((day.isoformat(), type(error).__name__, str(error)[:200]))
                consecutive_failures += 1
                print(f'{day}: FAILED {type(error).__name__}: {error}', flush=True)
            return consecutive_failures < 10

        if args.archive_raw:
            for day, filename in pending:
                if not ingest(day, filename):
                    break
        else:
            with ThreadPoolExecutor(max_workers=args.workers) as pool:
                for offset in range(0, len(pending), args.workers * 2):
                    batch = pending[offset:offset + args.workers * 2]
                    futures = {pool.submit(prepare, day, filename): (day, filename)
                               for day, filename in batch}
                    for future in as_completed(futures):
                        day, filename = futures[future]
                        try:
                            prepared_path = future.result()
                        except Exception as error:
                            failures.append((day.isoformat(), type(error).__name__, str(error)[:200]))
                            consecutive_failures += 1
                            print(f'{day}: FAILED PREPARE {type(error).__name__}: {error}', flush=True)
                            continue
                        if not ingest(day, filename, prepared_path):
                            break
                    if consecutive_failures >= 10:
                        print('Stopping after 10 consecutive failures', flush=True)
                        break
    output = args.manifest.with_name('imerg_backfill_failures.csv')
    with output.open('w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(('date', 'error_type', 'message'))
        writer.writerows(failures)
    print(f'Loaded {loaded} new days; {len(failures)} failures. Report: {output}', flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
