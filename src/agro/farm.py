"""Private farm operations. Derive the DB identity from Supabase Auth, never the request body."""

from contextlib import contextmanager
from datetime import date
from uuid import UUID

from agro.config import env
from agro.cereja_data import local_today
from agro.recommendation import coordinate, parse_day


class Unauthorized(Exception):
    pass


class Unavailable(Exception):
    pass


class NotFound(Exception):
    pass


class Auth:
    def __init__(self, auth_url=None, key=None):
        base = (env("SUPABASE_URL", default="") or "").rstrip("/")
        self.url = auth_url or (base + "/auth/v1" if base else "")
        self.key = key or env("SUPABASE_PUBLISHABLE_KEY") or env("SUPABASE_ANON_KEY")

    @property
    def enabled(self):
        return bool(self.url and self.key)

    def request(self, path, *, body=None, token=None):
        import requests

        if not self.enabled:
            raise Unavailable("Minha lavoura precisa da chave pública do Supabase no servidor.")
        headers = {"apikey": self.key}
        if token:
            headers["Authorization"] = "Bearer " + token
        try:
            response = requests.request("GET" if body is None else "POST",
                self.url.rstrip("/") + "/" + path, json=body, headers=headers, timeout=(3, 6))
        except requests.RequestException:
            raise Unavailable("O serviço de contas não respondeu. Tente novamente.") from None
        if response.status_code == 429:
            raise Unavailable("Muitas tentativas. Aguarde antes de tentar novamente.")
        if response.status_code >= 500:
            raise Unavailable("O serviço de contas não está disponível.")
        if not response.ok:
            raise Unauthorized("Não foi possível autenticar. Confira o e-mail, a confirmação e a senha.")
        return response.json() if response.content else {}

    def session(self, action, body):
        if action == "refresh":
            token = required_text(body.get("refresh_token"), 2048, "sessão")
            result = self.request("token?grant_type=refresh_token", body={"refresh_token": token})
        else:
            email = required_text(body.get("email"), 254, "e-mail")
            password = body.get("password")
            if not isinstance(password, str) or not password or len(password) > 256:
                raise ValueError("Informe a senha.")
            result = self.request("signup" if action == "signup" else "token?grant_type=password",
                                  body={"email": email, "password": password})
        return {key: result.get(key) for key in ("access_token", "refresh_token", "expires_in")}

    def user_id(self, header):
        if not header or not header.startswith("Bearer ") or len(header) > 8192:
            raise Unauthorized("Entre na sua conta para acessar Minha lavoura.")
        response = self.request("user", token=header[7:])
        try:
            return UUID(response["id"])
        except (ValueError, KeyError, TypeError):
            raise Unauthorized("Sessão inválida.") from None

    def logout(self, header):
        if not header or not header.startswith("Bearer ") or len(header) > 8192:
            raise Unauthorized("Sessão inválida.")
        self.request("logout?scope=local", body={}, token=header[7:])


def required_text(value, size, label):
    if not isinstance(value, str) or not 1 <= len(value.strip()) <= size:
        raise ValueError(f"Informe {label} (até {size} caracteres).")
    return value.strip()


def uuid_value(value, label, optional=False):
    if optional and value in (None, ""):
        return None
    try:
        return UUID(value)
    except (ValueError, TypeError, AttributeError):
        raise ValueError(f"Selecione {label}.") from None


def past_date(value, label):
    day = parse_day(value, label)
    if not date(1900, 1, 1) <= day <= local_today():
        raise ValueError(f"{label.capitalize()} precisa ser uma data real até hoje.")
    return day


class Farm:
    def __init__(self, repo, uid):
        self.repo, self.uid = repo, uid

    @contextmanager
    def connection(self):
        with self.repo.connection("minha_lavoura") as conn:
            conn.execute("SET LOCAL ROLE authenticated")
            conn.execute("""SELECT set_config('request.jwt.claim.sub', %s, true),
              set_config('request.jwt.claims', json_build_object('sub', %s::text, 'role', 'authenticated')::text, true)
            """, (str(self.uid), str(self.uid)))
            yield conn

    def list(self):
        with self.connection() as conn:
            return conn.execute("""
              SELECT ARRAY(SELECT to_jsonb(t)-'user_id' FROM public.cereja_plots t ORDER BY name, id) AS plots,
                     ARRAY(SELECT to_jsonb(t)-'user_id'-'parent_kind' FROM public.cereja_cycles t ORDER BY planted_on DESC, id) AS cycles,
                     ARRAY(SELECT to_jsonb(t)-'user_id' FROM public.cereja_tasks t ORDER BY planned_on, id) AS tasks,
                     ARRAY(SELECT to_jsonb(t)-'user_id'-'result' FROM public.cereja_assessments t
                           ORDER BY created_at DESC, id LIMIT 50) AS assessments
            """).fetchone()

    def add_plot(self, body):
        name = required_text(body.get("name"), 100, "o nome do talhão")
        lat, lon = coordinate(body)
        location = self.repo.locate(lat, lon)
        if not location or not location["inside"] or not location["cell_id"]:
            raise ValueError("O talhão deve estar na área de estudo de Cacoal.")
        with self.connection() as conn:
            return conn.execute("INSERT INTO public.cereja_plots(name,lat,lon) VALUES (%s,%s,%s) RETURNING id",
                                (name, lat, lon)).fetchone()

    def plot(self, value):
        with self.connection() as conn:
            row = conn.execute("SELECT id,lat,lon FROM public.cereja_plots WHERE id=%s",
                               (uuid_value(value, "um talhão"),)).fetchone()
        if not row:
            raise NotFound("Talhão não encontrado.")
        return row

    def add_cycle(self, body):
        cid = required_text(body.get("culture_id"), 80, "a cultura")
        table = self.repo.reference_data()
        culture = next((r for r in table["cultures"] if r["culture_id"] == cid), None)
        if not culture:
            raise ValueError("Selecione uma cultura do catálogo.")
        parent = uuid_value(body.get("parent_id"), "o ciclo de café", optional=True)
        if parent and culture["kind"] != "entrelinha":
            raise ValueError("Somente uma cultura de entrelinha pode ser vinculada a um ciclo de café.")
        args = (uuid_value(body.get("plot_id"), "um talhão"), cid, culture["kind"], parent,
                past_date(body.get("planted_on"), "data real do plantio"))
        with self.connection() as conn:
            return conn.execute("""
                INSERT INTO public.cereja_cycles(plot_id,culture_id,kind,parent_id,planted_on)
                VALUES (%s,%s,%s,%s,%s) RETURNING id
            """, args).fetchone()

    def close_cycle(self, key, body):
        day = past_date(body.get("ended_on"), "data de encerramento")
        with self.connection() as conn:
            result = conn.execute("""
                UPDATE public.cereja_cycles SET ended_on=%s WHERE id=%s AND ended_on IS NULL RETURNING id
            """, (day, uuid_value(key, "um ciclo"))).fetchone()
        if not result:
            raise NotFound("Ciclo ativo não encontrado.")
        return result

    def add_task(self, body):
        values = (uuid_value(body.get("plot_id"), "um talhão"),
                  uuid_value(body.get("cycle_id"), "um ciclo", optional=True),
                  required_text(body.get("title"), 120, "o título da tarefa"),
                  parse_day(body.get("planned_on"), "data prevista"))
        with self.connection() as conn:
            return conn.execute("""
                INSERT INTO public.cereja_tasks(plot_id,cycle_id,title,planned_on)
                VALUES (%s,%s,%s,%s) RETURNING id
            """, values).fetchone()

    def update_task(self, key, body):
        state = body.get("state")
        if state not in ("realizada", "cancelada"):
            raise ValueError("Estado de tarefa inválido.")
        day = past_date(body.get("done_on"), "data realizada") if state == "realizada" else None
        with self.connection() as conn:
            result = conn.execute("""
                UPDATE public.cereja_tasks SET state=%s,done_on=%s
                WHERE id=%s AND state='planejada' RETURNING id
            """, (state, day, uuid_value(key, "uma tarefa"))).fetchone()
        if not result:
            raise NotFound("Tarefa planejada não encontrada.")
        return result

    def add_assessment(self, plot, result):
        import json
        from psycopg.types.json import Jsonb

        with self.connection() as conn:
            return conn.execute("""
                INSERT INTO public.cereja_assessments(plot_id,reference_date,method_version,result)
                VALUES (%s,%s,%s,%s) RETURNING id
            """, (plot, result["reference_date"], result["method_version"],
                  Jsonb(result, dumps=lambda obj: json.dumps(obj, default=str)))).fetchone()

    def assessment(self, key):
        with self.connection() as conn:
            result = conn.execute("SELECT result FROM public.cereja_assessments WHERE id=%s",
                                  (uuid_value(key, "uma avaliação"),)).fetchone()
        if not result:
            raise NotFound("Avaliação não encontrada.")
        return result["result"]
