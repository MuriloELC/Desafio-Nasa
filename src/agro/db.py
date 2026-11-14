from pathlib import Path
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from agro.config import env

def connect():
    return psycopg.connect(env('DATABASE_URL', required=True), row_factory=dict_row, connect_timeout=20)

def migrate():
    root=Path(__file__).resolve().parents[2] / 'migrations'
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("CREATE SCHEMA IF NOT EXISTS agro")
            cur.execute("CREATE TABLE IF NOT EXISTS agro.schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())")
        for path in sorted(root.glob('*.sql')):
            with conn.cursor() as cur:
                cur.execute('SELECT 1 FROM agro.schema_migrations WHERE filename=%s',(path.name,))
                if cur.fetchone(): continue
                cur.execute(path.read_text())
                cur.execute('INSERT INTO agro.schema_migrations(filename) VALUES(%s)',(path.name,))
            conn.commit()
            print(f'Applied migration {path.name}')

def run_start(conn, command, source=None, start=None, end=None):
    row=conn.execute('INSERT INTO agro.etl_runs(command,source_id,period_start,period_end) VALUES(%s,%s,%s,%s) RETURNING run_id',(command,source,start,end)).fetchone()
    conn.commit()
    return row['run_id']

def run_finish(conn, run_id, count=0, error=None):
    conn.execute("UPDATE agro.etl_runs SET status=%s,records_written=%s,error=%s,ended_at=now() WHERE run_id=%s",('failed' if error else 'succeeded',count,str(error)[:2000] if error else None,run_id))
    conn.commit()

def batch_execute(conn, sql, rows):
    if not rows: return 0
    with conn.cursor() as cur:
        cur.executemany(sql, rows)
    conn.commit()
    return len(rows)
