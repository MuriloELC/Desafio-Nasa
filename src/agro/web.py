"""CEREJÁ local web app and JSON API."""

from datetime import date
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import logging
import os
from pathlib import Path
import re
from time import monotonic
from urllib.parse import parse_qs, urlsplit
from uuid import UUID

from agro.cereja_data import Repository
from agro.config import env
from agro.farm import Auth, Farm, NotFound, Unauthorized, Unavailable
from agro.recommendation import assessment_inputs, calendar_payload, coordinate, evaluate, number

HERE = Path(__file__).resolve().parent
STATIC = {
    "/": ("web.html", "text/html; charset=utf-8"),
    "/index.html": ("web.html", "text/html; charset=utf-8"),
    "/assets/cereja.css": ("site/cereja.css", "text/css; charset=utf-8"),
    "/assets/prototipo.js": ("site/prototipo.js", "text/javascript; charset=utf-8"),
    "/assets/cereja.js": ("site/cereja.js", "text/javascript; charset=utf-8"),
    "/assets/lavoura.js": ("site/lavoura.js", "text/javascript; charset=utf-8"),
}
LOG = logging.getLogger(__name__)


class Service:
    def __init__(self, repository, auth=None):
        self.repo = repository
        self.auth = auth if auth is not None else Auth()

    def recommendation(self, body, location=None):
        lat, lon = (location["lat"], location["lon"]) if location else coordinate(body)
        reference, fields = assessment_inputs(body)
        found = self.repo.locate(lat, lon)
        if found is None:
            raise Unavailable("A região de Cacoal ainda não está cadastrada.")
        if not found["inside"] or not found["cell_id"]:
            return {"inside": False, "candidates": [], "message": "Diagnóstico indisponível fora da área cadastrada."}
        cell = found["cell_id"]
        municipality = found["municipality"]
        data = self.repo.reference_data(for_engine=True, municipality=municipality)
        if not any(row["catalog_species"] for row in data["cultures"]):
            raise Unavailable("O catálogo ainda não foi importado.")
        result = evaluate(data, self.repo.climate(cell, reference), fields, reference, municipality)
        return {**result, "inside": True, "cell_id": cell, "cell_grid_km": 5, "municipality": municipality}

    def dispatch(self, method, path, query, body, auth_header):
        if method == "GET" and path == "/api/consulta":
            lat, lon = coordinate(query)
            radius = number(query.get("raio", "20"), 0, 20)
            if radius == 0:
                raise ValueError("O raio deve ser maior que zero e de até 20 km.")
            return self.repo.diagnosis(lat, lon, radius)
        if method == "GET" and path == "/api/calendario":
            municipality = query.get("municipio")
            if municipality is not None and not re.fullmatch(r"11[0-9]{5}", municipality):
                raise ValueError("Informe um código municipal IBGE de Rondônia.")
            return calendar_payload(self.repo.reference_data(municipality=municipality), query)
        if method == "POST" and path == "/api/recomendacoes":
            return self.recommendation(body)
        if method == "GET" and path == "/api/config":
            return {"minha_lavoura": self.auth.enabled}
        if method == "POST" and path in ("/api/auth/login", "/api/auth/signup", "/api/auth/refresh"):
            return self.auth.session(path.rsplit("/", 1)[1], body)
        if method == "POST" and path == "/api/auth/logout":
            self.auth.logout(auth_header)
            return {"ok": True}
        if not path.startswith("/api/lavoura"):
            raise NotFound("Rota não encontrada.")
        farm = Farm(self.repo, self.auth.user_id(auth_header))
        route = path.removeprefix("/api/lavoura")
        if method == "GET" and route == "":
            return farm.list()
        if method == "POST":
            if route == "/talhoes":
                return farm.add_plot(body)
            if route == "/ciclos":
                return farm.add_cycle(body)
            if route == "/tarefas":
                return farm.add_task(body)
            if route == "/avaliacoes":
                plot = farm.plot(body.get("plot_id"))
                result = self.recommendation(body, location=plot)
                if not result["inside"]:
                    raise ValueError(result["message"])
                return farm.add_assessment(plot["id"], result)
        first, sep, key = route.lstrip("/").partition("/")
        if sep and "/" not in key:
            if method == "PATCH" and first == "tarefas":
                return farm.update_task(key, body)
            if method == "PATCH" and first == "ciclos":
                return farm.close_cycle(key, body)
            if method == "GET" and first == "avaliacoes":
                return farm.assessment(key)
        raise NotFound("Rota não encontrada.")


def encode(value):
    if isinstance(value, (date, UUID)):
        return str(value)
    raise TypeError(type(value).__name__)


class Handler(BaseHTTPRequestHandler):
    server_version = "Cereja"
    sys_version = ""

    def respond(self, status, body, content_type, cache="no-store"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy",
            "default-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https://tile.openstreetmap.org; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(body)

    def log_request(self, code="-", size="-"):
        # Never log URL query strings, coordinates, auth headers or producer payloads.
        pass

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
        path = urlsplit(self.path).path
        if self.command == "GET" and path in self.server.static:
            data, content_type = self.server.static[path]
            self.respond(HTTPStatus.OK, data, content_type,
                         "no-cache" if path in ("/", "/index.html") else "public, max-age=300")
            return
        status = HTTPStatus.OK
        try:
            url = urlsplit(self.path)
            args = {key: values[0] for key, values in parse_qs(url.query, max_num_fields=20).items()}
            body = self.request_json() if self.command in ("POST", "PATCH") else {}
            result = self.server.service.dispatch(self.command, path, args, body, self.headers.get("Authorization"))
            data = json.dumps(result, ensure_ascii=False, default=encode, allow_nan=False).encode("utf-8")
        except (json.JSONDecodeError, UnicodeError):
            status, message = HTTPStatus.BAD_REQUEST, "JSON inválido."
        except (ValueError, NotFound, Unauthorized, Unavailable) as error:
            status = {ValueError: 400, NotFound: 404, Unauthorized: 401, Unavailable: 503}.get(type(error), 400)
            message = str(error)
        except Exception as error:
            if getattr(error, "sqlstate", None) in ("23503", "23514", "22008"):
                status, message = 400, "O vínculo ou a data informada não é válido para este registro."
            else:
                LOG.warning("request failure=%s sqlstate=%s", type(error).__name__, getattr(error, "sqlstate", None))
                status, message = 503, "Não foi possível consultar o serviço. Tente novamente."
        if status != HTTPStatus.OK:
            data = json.dumps({"error": message}, ensure_ascii=False).encode("utf-8")
        LOG.info("http method=%s status=%s duration_ms=%.1f", self.command, status, (monotonic()-started)*1000)
        try:
            self.respond(status, data, "application/json; charset=utf-8")
        except (BrokenPipeError, ConnectionResetError):
            pass

    do_GET = do_POST = do_PATCH = handle_request


def make_server(address, service):
    assets = {(filename, content_type): ((HERE / filename).read_bytes(), content_type)
              for filename, content_type in set(STATIC.values())}
    server = ThreadingHTTPServer(address, Handler)
    server.static = {path: assets[pair] for path, pair in STATIC.items()}
    server.service = service
    return server


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    repo = Repository(env("DATABASE_URL", required=True), ttl=max(0, min(300, int(os.getenv("WEB_CACHE_TTL", "300")))))
    repo.pool.open()
    try:
        with make_server((os.getenv("WEB_HOST", "127.0.0.1"), int(os.getenv("WEB_PORT", "8000"))), Service(repo)) as server:
            print(f"CEREJÁ em http://{server.server_address[0]}:{server.server_port}", flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass
    finally:
        repo.pool.close()


if __name__ == "__main__":
    main()
