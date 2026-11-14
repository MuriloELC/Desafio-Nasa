import os
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def env(name: str, required=False, default=None):
    result = os.getenv(name, default)
    if required and not result:
        raise RuntimeError(f"Missing environment variable {name}")
    return result

def data_dir():
    folder = Path(env('DATA_DIR', default='data'))
    folder.mkdir(parents=True, exist_ok=True)
    return folder
