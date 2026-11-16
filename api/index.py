"""Vercel entry point for the CEREJA JSON API."""

from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
import json
import logging
import os
from pathlib import Path
import sys
from time import monotonic
from urllib.parse import parse_qs, urlsplit


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from agro.cereja_data import Repository  # noqa: E402
from agro.config import env  # noqa: E402
from agro.farm import NotFound, Unauthorized, Unavailable  # noqa: E402
from agro.web import Service, encode  # noqa: E402


LOG = logging.getLogger(__name__)
_service = None


def get_service():
    """Reuse the connection pool while the serverless function remains warm."""
    global _service
    if _service is None:
        repository = Repository(
            env("DATABASE_URL", required=True),
            ttl=max(0, min(300, int(os.getenv("WEB_CACHE_TTL", "300")))),
        )
        repository.pool.open()
        _service = Service(repository)
    return _service


class handler(BaseHTTPRequestHandler):
    server_version = "Cereja"
    sys_version = ""

    def log_request(self, code="-", size="-"):
        # Do not log URL query strings, coordinates, auth headers or payloads.
        pass

    def respond(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.end_headers()
        self.wfile.write(body)

    def request_json(self):
        if self.headers.get_content_type() != "application/json":
            raise ValueError("Envie JSON.")
        size = int(self.headers.get("Content-Length", 0))
        if not 0 < size <= 16_384:
            raise ValueError("Tamanho de requisição inválido.")
        payload = json.loads(self.rfile.read(size))
        if not isinstance(payload, dict):
            raise ValueError("Envie um objeto JSON.")
        return payload

    def handle_request(self):
        started = monotonic()
        status = HTTPStatus.OK
        try:
            url = urlsplit(self.path)
            query = {
                key: values[0]
                for key, values in parse_qs(url.query, max_num_fields=20).items()
            }
            routed_path = query.pop("__path", "")
            path = f"/api/{routed_path.lstrip('/')}" if routed_path else url.path
            body = self.request_json() if self.command in ("POST", "PATCH") else {}
            result = get_service().dispatch(
                self.command,
                path,
                query,
                body,
                self.headers.get("Authorization"),
            )
            data = json.dumps(
                result, ensure_ascii=False, default=encode, allow_nan=False
            ).encode("utf-8")
        except (json.JSONDecodeError, UnicodeError):
            status, message = HTTPStatus.BAD_REQUEST, "JSON inválido."
        except (ValueError, NotFound, Unauthorized, Unavailable) as error:
            status = {
                ValueError: 400,
                NotFound: 404,
                Unauthorized: 401,
                Unavailable: 503,
            }.get(type(error), 400)
            message = str(error)
        except Exception as error:
            if getattr(error, "sqlstate", None) in ("23503", "23514", "22008"):
                status, message = 400, "O vínculo ou a data informada não é válido para este registro."
            else:
                LOG.warning(
                    "request failure=%s sqlstate=%s",
                    type(error).__name__,
                    getattr(error, "sqlstate", None),
                )
                status, message = 503, "Não foi possível consultar o serviço. Tente novamente."
        if status != HTTPStatus.OK:
            data = json.dumps({"error": message}, ensure_ascii=False).encode("utf-8")
        LOG.info(
            "http method=%s status=%s duration_ms=%.1f",
            self.command,
            status,
            (monotonic() - started) * 1000,
        )
        self.respond(status, data)

    do_GET = do_POST = do_PATCH = handle_request
