import argparse
from datetime import date,timedelta
from agro.db import connect,migrate

def valid_date(s): return date.fromisoformat(s)

def main():
    parser=argparse.ArgumentParser(description='Agro ETL — Cacoal, raio de 20 km')
    sub=parser.add_subparsers(dest='cmd',required=True)
    sub.add_parser('migrate');sub.add_parser('init-grid');sub.add_parser('validate')
    p=sub.add_parser('power');p.add_argument('--start',type=valid_date,required=True);p.add_argument('--end',type=valid_date,required=True)
    p=sub.add_parser('imerg');p.add_argument('--date',type=valid_date,required=True)
    p=sub.add_parser('backfill');p.add_argument('--start',type=valid_date,default=date(2000,1,1));p.add_argument('--end',type=valid_date,required=True);p.add_argument('--source',choices=['power','imerg'],default='power')
    p=sub.add_parser('daily');p.add_argument('--date',type=valid_date,required=True);p.add_argument('--source',choices=['power','imerg','both'],default='both')
    p=sub.add_parser('static-raster');p.add_argument('--file',required=True);p.add_argument('--source',choices=['SOILGRIDS','SRTM','FAO_HWSD'],required=True);p.add_argument('--metric',required=True);p.add_argument('--unit',required=True);p.add_argument('--scale',type=float,default=1.0);p.add_argument('--depth-top',type=int,default=0);p.add_argument('--depth-bottom',type=int,default=0)
    args=parser.parse_args()
    if args.cmd in ('migrate','init-grid'):
        migrate()
        if args.cmd=='init-grid':
            from agro.grid import register_power_samples
            with connect() as conn:
                samples,mappings=register_power_samples(conn)
                print(f'Created sample mapping: {samples} POWER samples -> {mappings} subcells')
        return
    with connect() as conn:
        if args.cmd=='validate':
            from agro.grid import REGION_ID
            rows=conn.execute('SELECT level,count(*) AS n,round((sum(extensions.ST_Area(geom))/1e6)::numeric,2) AS km2 FROM agro.grid_cells WHERE region_id=%s GROUP BY level ORDER BY level',(REGION_ID,)).fetchall()
            for row in rows: print(row)
        elif args.cmd=='power':
            from agro.extractors.power import load
            print(f'POWER rows written: {load(conn,args.start,args.end)}')
        elif args.cmd=='imerg':
            from agro.extractors.imerg import load
            print(f'IMERG cells written: {load(conn,args.date)}')
        elif args.cmd=='static-raster':
            from agro.extractors.static_raster import load
            print(f'Static properties written: {load(conn,args.file,args.source,args.metric,args.unit,args.scale,args.depth_top,args.depth_bottom)}')
        elif args.cmd=='daily':
            if args.source in ('power','both'):
                from agro.extractors.power import load
                print(f'POWER rows written: {load(conn,args.date,args.date)}')
            if args.source in ('imerg','both'):
                from agro.extractors.imerg import load
                print(f'IMERG cells written: {load(conn,args.date)}')
        elif args.cmd=='backfill':
            if args.start>args.end: parser.error('start must be before or equal to end')
            if args.source=='power':
                from agro.extractors.power import load
                cursor=args.start
                while cursor<=args.end:
                    end=min(args.end,date(cursor.year,12,31))
                    print(f'POWER {cursor}..{end}: {load(conn,cursor,end)} records')
                    cursor=end+timedelta(days=1)
            else:
                from agro.extractors.imerg import load
                cursor=args.start
                while cursor<=args.end:
                    print(f'IMERG {cursor}: {load(conn,cursor)} cells')
                    cursor+=timedelta(days=1)

if __name__=='__main__': main()
