"""Inventory daily Final IMERG GIS ZIPs exposed by the NASA PPS archive."""
import argparse
import csv
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path
from threading import local

import requests

from agro.config import env
from agro.extractors.imerg import BASE, Hrefs


_thread = local()


def session():
    if not hasattr(_thread, 'session'):
        _thread.session = requests.Session()
        _thread.session.auth = (env('PPS_USERNAME', required=True),
                                env('PPS_PASSWORD', required=True))
    return _thread.session


def inspect(day):
    directory = f'{BASE}{day:%Y/%m/%d}/gis/'
    for attempt in range(3):
        try:
            response = session().get(directory, timeout=30)
            if response.status_code == 404:
                return day.isoformat(), 'missing_directory', ''
            response.raise_for_status()
            links = Hrefs()
            links.feed(response.text)
            candidates = sorted(x for x in links.hrefs
                                if '3B-DAY-GIS' in x and f'.{day:%Y%m%d}-' in x
                                and '.V07' in x and x.lower().endswith('.zip'))
            if not candidates:
                return day.isoformat(), 'missing_zip', ''
            return day.isoformat(), 'available', candidates[-1]
        except requests.RequestException as error:
            _thread.session.close()
            del _thread.session
            if attempt == 2:
                return day.isoformat(), 'error', type(error).__name__
            time.sleep(attempt + 1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', type=date.fromisoformat, default=date(2000, 6, 1))
    parser.add_argument('--end', type=date.fromisoformat, required=True)
    parser.add_argument('--workers', type=int, default=8)
    parser.add_argument('--retry-errors', action='store_true',
                        help='Reuse existing output and recheck only request errors')
    parser.add_argument('--seed', type=Path,
                        help='Reuse dates already checked in another manifest')
    parser.add_argument('--output', type=Path, default=Path('/app/data/imerg_availability.csv'))
    args = parser.parse_args()
    if args.start > args.end or not 1 <= args.workers <= 16:
        parser.error('Require start <= end and 1 <= workers <= 16')
    days = []
    current = args.start
    while current <= args.end:
        days.append(current)
        current += timedelta(days=1)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    previous = {}
    if args.seed:
        with args.seed.open(newline='', encoding='utf-8') as file:
            previous.update({row['date']: (row['date'], row['status'], row['filename'])
                             for row in csv.DictReader(file)})
    if args.retry_errors and args.output.exists():
        with args.output.open(newline='', encoding='utf-8') as file:
            previous.update({row['date']: (row['date'], row['status'], row['filename'])
                             for row in csv.DictReader(file)})
    remaining = [day for day in days if day.isoformat() not in previous
                 or previous[day.isoformat()][1] == 'error']
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        checked = {row[0]: row for row in pool.map(inspect, remaining)}
    rows = [checked.get(day.isoformat()) or previous[day.isoformat()]
            for day in days]
    with args.output.open('w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(('date', 'status', 'filename'))
        writer.writerows(rows)
    print(f'Mapped {len(rows)} days to {args.output}', flush=True)
    for year in range(args.start.year, args.end.year + 1):
        counts = Counter(status for day, status, _ in rows if day.startswith(str(year)))
        print(f'{year}: {dict(counts)}', flush=True)
    if any(status == 'error' for _, status, _ in rows):
        raise SystemExit('Some requests failed; rerun or inspect error rows before loading')


if __name__ == '__main__':
    main()
