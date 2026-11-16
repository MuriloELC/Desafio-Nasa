"""Run only with CEREJA_TEST_DATABASE_URL pointing to an initialized disposable database."""

import os
from uuid import uuid4

import pytest
from psycopg.errors import ForeignKeyViolation

from agro.cereja_data import Repository, local_today
from agro.farm import Auth, Farm, NotFound, Unauthorized
from agro.web import Service


DATABASE = os.getenv("CEREJA_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DATABASE, reason="requires disposable PostgreSQL + fixtures")


@pytest.fixture
def repo():
    db = Repository(DATABASE, ttl=1)
    db.pool.open(wait=True)
    try:
        yield db
    finally:
        db.pool.close()


def test_scope_is_admin_boundary_not_study_circle(repo):
    center = repo.diagnosis(-11.4386,-61.4472,20)
    assert center["inside"] and center["daily"] and center["municipality"] == "1100049"
    small = repo.diagnosis(-11.4386,-61.4472,.01)
    assert not small["inside"] and small["cell_id"] is None and not small["daily"]
    assert repo.diagnosis(-11.4387,-61.4472,20)["latitude"] == -11.4387
    outside = repo.diagnosis(0,0,20)
    assert not outside["inside"] and outside["municipality"] is None


def test_private_farm_lifecycle_and_rls(repo):
    ids = [uuid4(), uuid4()]
    with repo.connection("fixture") as conn:
        for user in ids:
            conn.execute("INSERT INTO auth.users (id) VALUES (%s)", (user,))
    try:
        a, b = (Farm(repo, user) for user in ids)
        plot = a.add_plot({"name":"Talhão teste","lat":-11.4386,"lon":-61.4472})["id"]
        same_user_other_plot = a.add_plot({"name":"Outro talhão","lat":-11.4386,"lon":-61.4472})["id"]
        args = {"plot_id":str(plot),"planted_on":"2024-03-10"}
        coffee = a.add_cycle(args | {"culture_id":"cafe-conilon"})["id"]
        cover = a.add_cycle(args | {"culture_id":"milheto","parent_id":str(coffee)})["id"]
        with pytest.raises(ForeignKeyViolation):
            a.add_cycle(args | {"plot_id":str(same_user_other_plot),"culture_id":"milheto","parent_id":str(coffee)})
        a.close_cycle(str(cover),{"ended_on":"2024-09-12"})
        assert a.list()["tasks"] == []
        cycles = {row["id"]:row for row in a.list()["cycles"]}
        assert cycles[str(coffee)]["ended_on"] is None
        assert cycles[str(cover)]["ended_on"] == "2024-09-12"
        task = a.add_task({"plot_id":str(plot),"cycle_id":str(cover),"title":"Roçada planejada","planned_on":"2024-08-05"})["id"]
        a.update_task(str(task),{"state":"realizada","done_on":"2024-08-06"})
        saved = Service(repo).recommendation({"lat":-11.4386,"lon":-61.4472,"reference_date":str(local_today())})
        evaluation = a.add_assessment(plot, saved)["id"]
        assert a.assessment(str(evaluation))["method_version"] == "cereja-regras-5"
        assert a.list()["tasks"][0]["done_on"] == "2024-08-06"
        assert b.list() == {"plots":[],"cycles":[],"tasks":[],"assessments":[]}
        with pytest.raises(NotFound):
            b.assessment(str(evaluation))
        with pytest.raises(NotFound):
            b.update_task(str(task),{"state":"cancelada"})
        with pytest.raises(ForeignKeyViolation):
            b.add_task({"plot_id":str(plot),"title":"Não permitido","planned_on":"2024-08-05"})
        with pytest.raises(Unauthorized):
            Service(repo).dispatch("GET","/api/lavoura",{}, {}, None)
    finally:
        with repo.connection("fixture") as conn:
            conn.execute("DELETE FROM auth.users WHERE id=ANY(%s)", (ids,))


@pytest.mark.skipif(not os.getenv("CEREJA_TEST_GOTRUE_URL"), reason="requires local Supabase Auth")
def test_supabase_auth_signup_login_and_private_api(repo):
    service = Service(repo, Auth(os.environ["CEREJA_TEST_GOTRUE_URL"], "test-only"))
    credentials = {"email":f"{uuid4().hex}@example.com","password":"Cereja-Teste-2026!!"}
    uid = None
    try:
        delivery = service.dispatch("POST","/api/auth/signup",{},credentials,None)
        assert delivery.get("access_token")
        token = service.dispatch("POST","/api/auth/login",{},credentials,None)
        header = "Bearer " + token["access_token"]
        uid = service.auth.user_id(header)
        assert service.dispatch("GET","/api/lavoura",{}, {}, header)["plots"] == []
        service.dispatch("POST","/api/lavoura/talhoes",{}, {"name":"Talhão do login","lat":-11.4386,"lon":-61.4472}, header)
        assert service.dispatch("GET","/api/lavoura",{}, {}, header)["plots"][0]["name"] == "Talhão do login"
        refreshed = service.dispatch("POST","/api/auth/refresh",{},{"refresh_token":token["refresh_token"]},None)
        assert service.auth.user_id("Bearer " + refreshed["access_token"]) == uid
        service.dispatch("POST","/api/auth/logout",{},{},"Bearer " + refreshed["access_token"])
        with pytest.raises(Unauthorized):
            service.dispatch("POST","/api/auth/refresh",{},{"refresh_token":refreshed["refresh_token"]},None)
    finally:
        if uid:
            with repo.connection("fixture") as conn:
                conn.execute("DELETE FROM auth.users WHERE id=%s",(uid,))
