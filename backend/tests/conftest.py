import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, make_url
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models
from app.core.config import get_settings
from app.core.database import Base, get_db
from app.main import app
from app.seed import SENHA_DEMO, recarregar

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if TEST_DATABASE_URL and not make_url(TEST_DATABASE_URL).database.endswith("_teste"):
    # a fixture apaga todas as tabelas; nunca pode apontar para o banco de desenvolvimento
    raise pytest.UsageError("TEST_DATABASE_URL precisa apontar para um banco terminado em _teste.")


@pytest.fixture()
def engine():
    if TEST_DATABASE_URL:
        eng = create_engine(TEST_DATABASE_URL)
        Base.metadata.drop_all(eng)
    else:
        eng = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    with Session(engine, expire_on_commit=False) as sessao:
        yield sessao


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    get_settings().demo_mode = True
    recarregar(db)
    yield TestClient(app)
    app.dependency_overrides.clear()
    get_settings().demo_mode = False


@pytest.fixture()
def entrar(client):
    """entrar("marina.costa") -> cabeçalhos com o token desse usuário do seed."""
    def _entrar(chave: str) -> dict:
        r = client.post("/auth/login", json={"email": f"{chave}@seedabit.org.br", "senha": SENHA_DEMO})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['token']}"}
    return _entrar
