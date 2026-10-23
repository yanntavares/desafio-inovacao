"""Endpoints de apoio às telas: selects, pré-visualização, projetos, busca e notificações."""

from datetime import date, timedelta

from sqlalchemy import func, select

from app.models import Jornada, Reuniao


def test_opcoes_de_reuniao_respeitam_visibilidade(client, entrar):
    r = client.get("/reunioes/opcoes", headers=entrar("marina.costa"))
    assert r.status_code == 200
    corpo = r.json()
    assert "exploratoria" in corpo["tipos"]
    leads = {l["cliente"]: l for l in corpo["leads"]}
    assert "Escola Aurora" not in leads  # lead do Lucas
    assert leads["Instituto Horizonte"]["aceita_reuniao"] is True
    assert leads["Clínica Vitalis"]["aceita_reuniao"] is False  # handoff já enviado


def test_pre_visualizar_valida_sem_gravar(client, db, entrar):
    antes = db.scalar(select(func.count(Reuniao.id)))
    r = client.post("/reunioes/pre-visualizar", headers=entrar("marina.costa"),
                    files={"arquivo": ("reuniao.txt", b"Helena: ligue para (11) 98765-4321.\nMarina: certo.")})
    assert r.status_code == 200, r.text
    assert r.json()["formato"] == "txt" and r.json()["segmentos"] >= 1 and r.json()["dados_mascarados"] == 1
    assert db.scalar(select(func.count(Reuniao.id))) == antes

    r = client.post("/reunioes/pre-visualizar", headers=entrar("marina.costa"),
                    files={"arquivo": ("reuniao.pdf", b"x")})
    assert r.status_code == 422 and ".vtt" in r.json()["detail"]
    r = client.post("/reunioes/pre-visualizar", headers=entrar("diretoria"), data={"texto": "Ana: oi"})
    assert r.status_code == 403


def test_projetos_do_gerente(client, entrar):
    r = client.get("/projetos", headers=entrar("camila.reis"))
    assert r.status_code == 200
    assert {c["cliente"] for c in r.json()} == {"Rede Folha", "Padaria Trigal"}
    assert client.get("/projetos", headers=entrar("rafael.lima")).json() == []


def test_busca_respeita_visibilidade_e_papel(client, entrar):
    r = client.get("/busca", params={"q": "escola"}, headers=entrar("marina.costa")).json()
    assert r == {"leads": [], "usuarios": []}  # Escola Aurora é do Lucas
    r = client.get("/busca", params={"q": "lucas"}, headers=entrar("marina.costa")).json()
    assert r["usuarios"] == []
    r = client.get("/busca", params={"q": "lucas"}, headers=entrar("diretoria")).json()
    assert [u["nome"] for u in r["usuarios"]] == ["Lucas Prado"]
    r = client.get("/busca", params={"q": "horiz"}, headers=entrar("rafael.lima")).json()
    assert [l["cliente"] for l in r["leads"]] == ["Instituto Horizonte"]
    assert client.get("/busca", params={"q": "a"}, headers=entrar("diretoria")).json()["leads"] == []


def test_notificacoes_do_gerente_e_marcar_lidas(client, entrar):
    h = entrar("rafael.lima")
    r = client.get("/notificacoes", headers=h).json()
    assert any("Clínica Vitalis" in i["texto"] for i in r["itens"])
    assert r["nao_lidas"] >= 1
    assert client.post("/notificacoes/lidas", headers=h).status_code == 200
    assert client.get("/notificacoes", headers=h).json()["nao_lidas"] == 0
    # devolução notifica o analista responsável
    vitalis = next(i["jornada_id"] for i in r["itens"] if "Clínica Vitalis" in i["texto"])
    client.post(f"/jornadas/{vitalis}/handoff/devolver", headers=h, json={"comentario": "Faltam os prazos."})
    textos = [i["texto"] for i in client.get("/notificacoes", headers=entrar("marina.costa")).json()["itens"]]
    assert any("devolveu" in t and "Clínica Vitalis" in t for t in textos)
    # extração feita pelo sistema no seed avisa o analista
    assert any("Extração concluída" in t for t in textos)


def _id(db, cliente):
    return db.scalar(select(Jornada.id).where(Jornada.cliente_nome == cliente))


def test_resumo_gerencial_antes_do_aceite(client, db, entrar):
    vitalis = _id(db, "Clínica Vitalis")  # handoff enviado ao Rafael
    assert client.get(f"/jornadas/{vitalis}", headers=entrar("rafael.lima")).json()["resumo_gerencial"]  # seed
    r = client.post(f"/jornadas/{vitalis}/documentos", headers=entrar("rafael.lima"),
                    json={"tipo": "resumo_gerencial"})
    assert r.status_code == 201 and r.json()["versao"] == 2
    for quem in ("camila.reis", "marina.costa"):
        r = client.post(f"/jornadas/{vitalis}/documentos", headers=entrar(quem), json={"tipo": "resumo_gerencial"})
        assert r.status_code == 403, quem
    # briefing de projeto continua só depois do aceite
    r = client.post(f"/jornadas/{vitalis}/documentos", headers=entrar("rafael.lima"),
                    json={"tipo": "briefing_projeto"})
    assert r.status_code == 409
    # devolvido, volta a em validação: sem resumo novo até reenviar
    client.post(f"/jornadas/{vitalis}/handoff/devolver", headers=entrar("rafael.lima"),
                json={"comentario": "Faltam os prazos."})
    r = client.post(f"/jornadas/{vitalis}/documentos", headers=entrar("rafael.lima"),
                    json={"tipo": "resumo_gerencial"})
    assert r.status_code == 409 and "handoff é enviado" in r.json()["detail"]


def test_auditoria_por_periodo(client, entrar):
    h = entrar("diretoria")
    hoje = date.today()
    amanha = (hoje + timedelta(days=1)).isoformat()
    assert client.get("/auditoria", params={"desde": amanha}, headers=h).json() == []
    assert client.get("/auditoria", params={"desde": hoje.isoformat(), "ate": hoje.isoformat()}, headers=h).json()
    r = client.get("/auditoria", params={"desde": amanha, "ate": hoje.isoformat()}, headers=h)
    assert r.status_code == 422 and "inicial" in r.json()["detail"]


def _historico(client, headers):
    corpo = client.get("/kanban", params={"concluidas": "true"}, headers=headers).json()
    return [c for coluna in corpo["colunas"] for c in coluna["cards"]]


def test_historico_do_seed_respeita_a_carteira(client, entrar):
    # o seed traz um lead concluído (Ateliê Vento Sul: Marina + Rafael) para o Histórico nascer com dados
    assert [c["cliente"] for c in _historico(client, entrar("marina.costa"))] == ["Ateliê Vento Sul"]
    assert [c["cliente"] for c in _historico(client, entrar("rafael.lima"))] == ["Ateliê Vento Sul"]
    assert _historico(client, entrar("lucas.prado")) == []  # lead de outro analista
    # concluído sai do quadro normal
    quadro = client.get("/kanban", headers=entrar("rafael.lima")).json()
    assert "Concluída" not in [c["etapa"] for c in quadro["colunas"]]


def test_tecnico_do_seed_so_le(client, entrar):
    tecnico = entrar("paulo.nunes")
    perfis = {p["papel"]: p for p in client.get("/auth/demo").json()}
    assert perfis["tecnico"]["email"] == "paulo.nunes@seedabit.org.br"
    cards = _historico(client, tecnico)
    assert [c["cliente"] for c in cards] == ["Ateliê Vento Sul"]  # vê todos, inclusive o histórico
    lead = cards[0]["id"]
    assert client.get(f"/jornadas/{lead}", headers=tecnico).status_code == 200
    assert client.post(f"/jornadas/{lead}/validar", headers=tecnico).status_code == 403
    assert client.post(f"/jornadas/{lead}/concluir", headers=tecnico).status_code == 403
    assert client.post(f"/jornadas/{lead}/documentos", headers=tecnico,
                       json={"tipo": "briefing_projeto"}).status_code == 403
    assert client.post("/reunioes/pre-visualizar", headers=tecnico, data={"texto": "Ana: oi"}).status_code == 403


def test_diretoria_nao_muda_o_proprio_perfil(client, db, entrar):
    h = entrar("diretoria")
    eu = client.get("/auth/me", headers=h).json()
    # com uma segunda Diretoria, a regra da última conta não se aplica; o que barra é a própria conta
    outra = client.get("/auth/me", headers=entrar("camila.reis")).json()
    assert client.patch(f"/usuarios/{outra['id']}", headers=h, json={"papel": "admin"}).status_code == 200
    r = client.patch(f"/usuarios/{eu['id']}", headers=h, json={"papel": "gerente"})
    assert r.status_code == 403 and "outra conta da Diretoria" in r.json()["detail"]
    assert client.get("/auth/me", headers=h).json()["papel"] == "admin"


def _clientes_do_historico(client, headers):
    corpo = client.get("/historico", headers=headers).json()
    ids = {int(i) for i in corpo}
    cards = [c for concl in ("false", "true")
             for col in client.get("/kanban", params={"concluidas": concl}, headers=headers).json()["colunas"]
             for c in col["cards"]]
    return {c["cliente"] for c in cards if c["id"] in ids}, corpo


def test_historico_agregado_respeita_a_carteira(client, entrar):
    marina, corpo = _clientes_do_historico(client, entrar("marina.costa"))
    assert "Ateliê Vento Sul" in marina and "Escola Aurora" not in marina  # Escola Aurora é do Lucas
    concluido = next(v for v in corpo.values() if any(d["tipo"] == "pauta_kickoff" for d in v["documentos"]))
    assert concluido["pacotes"] and concluido["apos_o_aceite"] == []
    # o gerente vê só os leads cujo pacote recebeu, não a carteira inteira
    assert _clientes_do_historico(client, entrar("rafael.lima"))[0] == {"Clínica Vitalis", "Ateliê Vento Sul"}
    lucas = _clientes_do_historico(client, entrar("lucas.prado"))[0]
    assert "Escola Aurora" in lucas and "Ateliê Vento Sul" not in lucas
    assert "Escola Aurora" in _clientes_do_historico(client, entrar("paulo.nunes"))[0]  # técnico vê todos
    assert client.get("/historico").status_code == 401
