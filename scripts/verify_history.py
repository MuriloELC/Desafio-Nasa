"""Compare Supabase ingestion with the mapped source availability."""
import argparse
import csv
from collections import Counter
from datetime import date
from pathlib import Path

from agro.db import connect


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=Path, required=True)
    args = parser.parse_args()
    with args.manifest.open(newline='', encoding='utf-8') as file:
        expected = {date.fromisoformat(row['date']) for row in csv.DictReader(file)
                    if row['status'] == 'available'}
    with connect() as conn:
        completed = {row['period_start'] for row in conn.execute('''
            SELECT DISTINCT period_start FROM agro.etl_runs
            WHERE command='imerg_daily' AND status='succeeded' ''').fetchall()}
        rows = conn.execute('''
            SELECT observed_on,count(*) AS cells,min(valid_fraction) AS min_fraction,
                   max(value) AS max_mm FROM agro.cell_daily
            WHERE source_id='IMERG_FINAL' GROUP BY observed_on ''').fetchall()
        power = conn.execute('''
            SELECT metric,count(*) AS rows,min(observed_on) AS first_day,
                   max(observed_on) AS last_day FROM agro.sample_daily
            GROUP BY metric ORDER BY metric ''').fetchall()
        size = conn.execute('SELECT pg_database_size(current_database()) AS bytes').fetchone()['bytes']
    by_year = Counter(day.year for day in expected)
    done_by_year = Counter(day.year for day in expected & completed)
    print(f'IMERG mapped={len(expected)}, completed={len(expected & completed)}, '
          f'pending={len(expected - completed)}, database_bytes={size}')
    for year in sorted(by_year):
        print(f'  {year}: {done_by_year[year]}/{by_year[year]} days')
    partial = [row for row in rows if row['cells'] < 400]
    extreme = [row for row in rows if row['max_mm'] > 1000]
    print(f'IMERG days with <400 cells: {len(partial)}; days with max >1000 mm: {len(extreme)}')
    for row in power:
        print(f"POWER {row['metric']}: {row['rows']} rows, "
              f"{row['first_day']}..{row['last_day']}")
    if expected - completed or extreme:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
