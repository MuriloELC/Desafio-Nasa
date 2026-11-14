"""Private Supabase Storage REST adapter; stores files with SHA-256 integrity."""
import hashlib
import requests
from urllib.parse import quote
from agro.config import env

def store(path,source_id,object_key,conn,observed_on=None):
    hasher=hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024*1024), b''):
            hasher.update(chunk)
    digest=hasher.hexdigest()
    size=path.stat().st_size
    url=env('SUPABASE_URL')
    token=env('SUPABASE_SERVICE_ROLE_KEY')
    bucket=env('SUPABASE_BUCKET',default='agro-rasters')
    if not url or not token:
        raise RuntimeError('Supabase Storage credentials missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    if url and token:
        endpoint=f"{url.rstrip('/')}/storage/v1/object/{quote(bucket,safe='')}/{quote(object_key,safe='/')}"
        headers={'Authorization':f'Bearer {token}','apikey':token,
                 'Content-Type':'application/octet-stream','x-upsert':'true'}
        with path.open('rb') as f:
            response=requests.post(endpoint,headers=headers,data=f,timeout=300)
        response.raise_for_status()
        stored_key=f'supabase://{bucket}/{object_key}'
    conn.execute('''INSERT INTO agro.raster_assets(source_id,observed_on,object_key,sha256,bytes,format)
        VALUES(%s,%s,%s,%s,%s,%s) ON CONFLICT(object_key) DO UPDATE
        SET sha256=excluded.sha256,bytes=excluded.bytes''',
        (source_id,observed_on,stored_key,digest,size,path.suffix.lstrip('.')))
    conn.commit()
    return stored_key
