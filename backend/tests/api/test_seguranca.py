"""Segredo do JWT fora do modo demo, limite de tentativas no login e renovação de token."""

import pytest
from sqlalchemy import func, select

from app.core.config import Settings
from app.models import Auditoria
from app.seed import SENHA_DEMO


@pytest.mark.parametrize(("demo", "segredo", "sobe"), [
    (False, "troque-isto", False),
    (False, "curto-demais", False),
    (False, "x" * 32, True),
    (True, "troque-isto", True),  # demonstração local
])
def test_api_nao_sobe_com_segredo_inseguro_fora_do_demo(demo, segredo, sobe):
    cfg = Settings(demo_mode=demo, jwt_secret=segredo, _env_file=None)
    if sobe:
        cfg.validar_producao()
    else:
        with pytest.raises(RuntimeError, match="JWT_SECRET"):
            cfg.validar_producao()


def _login(client, chave, senha):
    return client.post("/auth/login", json={"email": f"{chave}@seedabit.org.br", "senha": senha})


def _falhas(db):
    return db.scalar(select(func.count(Auditoria.id)).where(Auditoria.acao == "login_falhou"))


def test_login_bloqueia_depois_de_cinco_senhas_erradas(client, db):
    for _ in range(5):
        r = _login(client, "marina.costa", "senha-errada-1")
        assert r.status_code == 401 and r.json()["detail"] == "E-mail ou senha incorretos."
    assert _falhas(db) == 5
    r = _login(client, "marina.costa", SENHA_DEMO)  # nem a senha certa entra durante o bloqueio
    assert r.status_code == 429 and "Muitas tentativas" in r.json()["detail"]
    assert _login(client, "lucas.prado", SENHA_DEMO).status_code == 200  # outras contas seguem


def test_email_inexistente_tem_a_mesma_resposta_e_nao_registra(client, db):
    r = _login(client, "ninguem", "qualquer1234")
    assert r.status_code == 401 and r.json()["detail"] == "E-mail ou senha incorretos."
    assert _falhas(db) == 0


def test_renovar_token(client, entrar):
    h = entrar("marina.costa")
    r = client.post("/auth/renovar", headers=h)
    assert r.status_code == 200
    novo = {"Authorization": f"Bearer {r.json()['token']}"}
    assert client.get("/auth/me", headers=novo).json()["email"] == "marina.costa@seedabit.org.br"
    assert client.post("/auth/renovar").status_code == 401
