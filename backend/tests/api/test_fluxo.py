"""Fluxo ponta a ponta e invariantes: gates por papel, evidência, imutabilidade, auditoria."""

import json

from sqlalchemy import select

from app.models import Auditoria, Item, Jornada, PacoteHandoff, Pendencia
from app.models.enums import StatusPendencia
from app.services import transcricao
from app.services.documentos import conferir_numeros
from app.services.erros import ErroNegocio

import pytest


def _lead(db, cliente):
    return db.scalar(select(Jornada).where(Jornada.cliente_nome == cliente))


def _cadastrar(client, h, **extra):
    dados = {"cliente_nome": "Lead Novo", "titulo_negocio": "Site", "analista_id": 1,
             "data_reuniao": "2026-10-19", "tipo": "exploratoria",
             "participantes": json.dumps([{"nome": "Marina", "cliente": False}]),
             "texto": "Helena: O problema é que os alunos não conseguem rever as aulas.", **extra}
    return client.post("/reunioes", data=dados, headers=h)


# --- auth -------------------------------------------------------------------------

def test_cadastro_exige_email_institucional_senha_forte_e_lgpd(client):
    base = {"nome": "Ana", "email": "ana@seedabit.org.br", "senha": "senhaforte123",
            "confirmar_senha": "senhaforte123", "aceite_lgpd": True}
    assert client.post("/auth/cadastro", json={**base, "email": "ana@gmail.com"}).status_code == 422
    assert client.post("/auth/cadastro", json={**base, "senha": "curta1", "confirmar_senha": "curta1"}).status_code == 422
    assert client.post("/auth/cadastro", json={**base, "aceite_lgpd": False}).status_code == 422
    r = client.post("/auth/cadastro", json=base)
    assert r.status_code == 201
    assert r.json()["usuario"]["papel"] == "comercial"  # ninguém se auto-promove
    assert client.post("/auth/cadastro", json=base).status_code == 409


def test_login_e_rota_protegida(client, entrar):
    assert client.get("/kanban").status_code == 401
    r = client.post("/auth/login", json={"email": "marina.costa@seedabit.org.br", "senha": "errada12345"})
    assert r.status_code == 401
    assert client.get("/kanban", headers=entrar("marina.costa")).status_code == 200


def test_demo_so_com_modo_ligado(client):
    assert len(client.get("/auth/demo").json()) == 3
    get = __import__("app.core.config", fromlist=["get_settings"]).get_settings
    get().demo_mode = False
    assert client.get("/auth/demo").status_code == 404


# --- visibilidade e permissões (403 por papel x endpoint) -------------------------

def test_analista_ve_so_os_seus_leads_gerente_ve_todos(client, entrar):
    marina = client.get("/kanban", headers=entrar("marina.costa")).json()
    rafael = client.get("/kanban", headers=entrar("rafael.lima")).json()
    assert marina["visiveis"] < rafael["visiveis"] == rafael["total"]
    lucas_lead = client.get("/kanban", headers=entrar("lucas.prado")).json()["colunas"][0]["cards"][0]["id"]
    r = client.get(f"/jornadas/{lucas_lead}", headers=entrar("marina.costa"))
    assert r.status_code == 403 and "seus leads" in r.json()["detail"]


def test_matriz_403(client, db, entrar):
    lead = _lead(db, "Instituto Horizonte")
    handoff = _lead(db, "Clínica Vitalis")
    briefing = _lead(db, "Rede Folha")
    chamadas = [
        ("diretoria", "post", f"/jornadas/{lead.id}/validar", None),            # diretoria não aprova
        ("rafael.lima", "post", f"/jornadas/{lead.id}/validar", None),          # gerente não valida G2
        ("marina.costa", "post", f"/jornadas/{handoff.id}/handoff/aceitar", {"versao": 1}),  # não aceita o próprio
        ("diretoria", "post", f"/jornadas/{handoff.id}/handoff/aceitar", {"versao": 1}),
        ("camila.reis", "post", f"/jornadas/{handoff.id}/handoff/aceitar", {"versao": 1}),   # gerente não designado
        ("marina.costa", "post", f"/jornadas/{briefing.id}/documentos", {"tipo": "briefing_projeto"}),
        ("rafael.lima", "get", "/usuarios", None),
        ("marina.costa", "get", "/usuarios", None),
        ("marina.costa", "get", "/auditoria", None),
        ("rafael.lima", "get", "/auditoria", None),
        ("marina.costa", "get", "/painel/funil", None),
    ]
    for quem, metodo, url, corpo in chamadas:
        r = getattr(client, metodo)(url, headers=entrar(quem), **({"json": corpo} if corpo else {}))
        assert r.status_code == 403, (quem, url, r.status_code, r.text)
        assert r.json()["detail"]


def test_gerente_nao_cadastra_reuniao(client, entrar):
    assert _cadastrar(client, entrar("rafael.lima")).status_code == 403


# --- transcrição ------------------------------------------------------------------

def test_mascaramento_e_formatos():
    t = ("Ana: escreva para ana@x.com ou ligue (11) 91234-5678. CNPJ 12.345.678/0001-95, "
         "CPF 529.982.247-25 e 52998224725.")
    d = transcricao.processar(t, "colado")
    masc = d["segmentos"][0]["texto_mascarado"]
    for vazado in ("ana@x.com", "91234-5678", "12.345.678", "529.982", "52998224725"):
        assert vazado not in masc
    assert {m["tipo"] for m in d["mascaras"]} == {"email", "telefone", "cnpj", "cpf"}
    vtt = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\n<v Helena>Queremos um portal.</v>\n"
    seg = transcricao.processar(vtt, "vtt")["segmentos"]
    assert seg[0]["falante"] == "Helena" and seg[0]["texto_original"] == "Queremos um portal."


def test_recusa_arquivo_grande_e_formato_invalido(client, entrar):
    h = entrar("marina.costa")
    r = _cadastrar(client, h, texto="palavra " * 15001)
    assert r.status_code == 422 and "15 mil palavras" in r.json()["detail"]
    r = client.post("/reunioes", headers=h, files={"arquivo": ("x.pdf", b"abc")}, data={
        "titulo_negocio": "x", "analista_id": 1, "data_reuniao": "2026-10-19", "tipo": "exploratoria",
        "participantes": json.dumps([{"nome": "M"}])})
    assert r.status_code == 422 and ".vtt" in r.json()["detail"]


def test_cadastro_de_reuniao_nao_vaza_dado_pessoal_para_a_ia(client, db, entrar):
    h = entrar("marina.costa")
    uid = client.get("/auth/me", headers=h).json()["id"]
    r = _cadastrar(client, h, analista_id=uid, texto="Helena: falem comigo em helena@exemplo.com. "
                   "O problema é que os alunos não conseguem rever as aulas gravadas.")
    assert r.status_code == 201, r.text
    assert r.json()["dados_mascarados"] == 1 and r.json()["estado"] == "EXTRAINDO"
    for item in db.scalars(select(Item)):
        assert "helena@exemplo.com" not in item.descricao


# --- extração: evidência literal, sem valor inventado -----------------------------

def test_todo_item_extraido_tem_evidencia_literal(db, client):
    from app.models import Reuniao
    reunioes = {r.id: r for r in db.scalars(select(Reuniao))}
    itens = [i for i in db.scalars(select(Item)) if i.job_id]
    assert itens
    for it in itens:
        assert it.evidencias and it.origem.value == "explicita"
        seg = next(s for s in reunioes[it.reuniao_id].segmentos if s["ordem"] == it.evidencias[0]["segmento_ordem"])
        assert it.evidencias[0]["trecho"] in seg["texto_mascarado"]
        assert it.natureza_final is None or it.status_validacao.value != "pendente"


def test_orcamento_e_prazo_ausentes_viram_pendencia_bloqueante(client, db):
    j = _lead(db, "Instituto Horizonte")
    campos = {p.campo for p in db.scalars(select(Pendencia).where(
        Pendencia.jornada_id == j.id, Pendencia.severidade == "bloqueante"))}
    assert {"orcamento", "prazo"} <= campos
    assert not [i for i in db.scalars(select(Item).where(Item.jornada_id == j.id))
                if i.categoria.value in ("orcamento", "prazo")]


# --- G2: pendência bloqueante, natureza só por pessoa -----------------------------

def test_g2_bloqueado_com_motivo_escrito_e_depois_liberado(client, db, entrar):
    h = entrar("marina.costa")
    lead = _lead(db, "Instituto Horizonte")
    gates = client.get(f"/jornadas/{lead.id}/gates", headers=h).json()
    assert gates["G2"]["liberado"] is False and "bloqueante" in gates["G2"]["motivo"]
    r = client.post(f"/jornadas/{lead.id}/validar", headers=h)
    assert r.status_code == 409 and "bloqueantes abertas" in r.json()["detail"]
    for p in client.get(f"/jornadas/{lead.id}/pendencias", headers=h).json():
        if p["severidade"] == "bloqueante":
            sem = client.post(f"/pendencias/{p['id']}/resolver", headers=h, json={"acao": "aceitar_com_risco"})
            assert sem.status_code == 422  # exige justificativa
            ok = client.post(f"/pendencias/{p['id']}/resolver", headers=h,
                             json={"acao": "aceitar_com_risco", "justificativa": "Define após a proposta"})
            assert ok.status_code == 200
    assert client.post(f"/jornadas/{lead.id}/validar", headers=h).json()["estado"] == "VALIDADA"


def test_ia_nunca_decide_confirmar_exige_natureza_explicita(client, db, entrar):
    h = entrar("marina.costa")
    lead = _lead(db, "Instituto Horizonte")
    item = next(i for i in client.get(f"/jornadas/{lead.id}/itens", headers=h).json()
                if i["status_validacao"] == "pendente")
    assert client.patch(f"/itens/{item['id']}", headers=h, json={"acao": "confirmar"}).status_code == 422
    r = client.patch(f"/itens/{item['id']}", headers=h, json={"acao": "confirmar", "natureza_final": "acordado"})
    assert r.status_code == 200 and r.json()["natureza_final"] == "acordado"


# --- G3: pacote imutável, devolução, gerente designado ----------------------------

def test_g3_devolver_exige_comentario_e_nova_versao_preserva_a_antiga(client, db, entrar):
    lead = _lead(db, "Clínica Vitalis")
    ger, ana = entrar("rafael.lima"), entrar("marina.costa")
    antigo = db.scalar(select(PacoteHandoff).where(PacoteHandoff.jornada_id == lead.id))
    hash_v1 = antigo.hash
    assert client.post(f"/jornadas/{lead.id}/handoff/devolver", headers=ger, json={"comentario": " "}).status_code == 422
    assert client.post(f"/jornadas/{lead.id}/handoff/devolver", headers=ger,
                       json={"comentario": "Faltam prazos"}).json()["estado"] == "EM_VALIDACAO"
    detalhe = client.get(f"/jornadas/{lead.id}", headers=ana).json()
    assert detalhe["devolucao"]["comentario"] == "Faltam prazos"
    assert client.post(f"/jornadas/{lead.id}/validar", headers=ana).json()["estado"] == "VALIDADA"
    gerente_id = detalhe["gerente"]["id"]
    v2 = client.post(f"/jornadas/{lead.id}/handoff", headers=ana, json={"gerente_id": gerente_id}).json()
    assert v2["versao"] == 2
    db.refresh(antigo)
    assert antigo.hash == hash_v1  # snapshot v1 intacto
    errada = client.post(f"/jornadas/{lead.id}/handoff/aceitar", headers=ger, json={"versao": 1})
    assert errada.status_code == 409
    assert client.post(f"/jornadas/{lead.id}/handoff/aceitar", headers=ger, json={"versao": 2}).json()["estado"] == "ACEITO"


# --- documentos: números só dos itens validados, aprovado é imutável --------------

def test_numero_inventado_bloqueia_documento():
    conferir_numeros("# T\n- Orçamento de R$ 5.000", ["Orçamento de R$ 5.000"])
    with pytest.raises(ErroNegocio, match="R\\$ 10.000"):
        conferir_numeros("# T\n- Valor de R$ 10.000", ["Orçamento de R$ 5.000"])


def test_documento_aprovado_vira_nova_versao_ao_editar(client, db, entrar):
    h = entrar("marina.costa")
    lead = _lead(db, "Mercado Pátio")
    doc = client.post(f"/jornadas/{lead.id}/documentos", headers=h, json={"tipo": "resumo_comercial"}).json()
    assert client.put(f"/documentos/{doc['id']}", headers=h,
                      json={"conteudo_md": doc["conteudo_md"] + "\nValor de R$ 99.999"}).status_code == 422
    assert client.post(f"/documentos/{doc['id']}/aprovar", headers=h).json()["status"] == "aprovado"
    novo = client.put(f"/documentos/{doc['id']}", headers=h, json={"conteudo_md": doc["conteudo_md"] + "\n"}).json()
    assert novo["versao"] == 2 and novo["status"] == "rascunho"
    assert client.get(f"/documentos/{doc['id']}", headers=h).json()["status"] == "aprovado"


def test_briefing_g4_e_conclusao(client, db, entrar):
    lead = _lead(db, "Padaria Trigal")
    ger = entrar("camila.reis")
    pauta = client.post(f"/jornadas/{lead.id}/documentos", headers=ger, json={"tipo": "pauta_kickoff"}).json()
    assert client.post(f"/jornadas/{lead.id}/concluir", headers=ger).status_code == 409  # pauta ainda não aprovada
    client.post(f"/documentos/{pauta['id']}/aprovar", headers=ger)
    assert client.post(f"/jornadas/{lead.id}/concluir", headers=ger).json()["estado"] == "CONCLUIDA"


# --- auditoria na mesma transação -------------------------------------------------

def test_toda_acao_gera_auditoria_com_antes_e_depois(client, db, entrar):
    h = entrar("marina.costa")
    lead = _lead(db, "Instituto Horizonte")
    item = client.get(f"/jornadas/{lead.id}/itens", headers=h).json()[0]
    antes = db.scalar(select(Auditoria.id).order_by(Auditoria.id.desc()).limit(1))
    client.patch(f"/itens/{item['id']}", headers=h, json={"acao": "rejeitar"})
    novo = db.scalars(select(Auditoria).where(Auditoria.id > antes, Auditoria.acao == "rejeitar_item")).one()
    assert novo.antes["status_validacao"] == "pendente" and novo.depois["status_validacao"] == "rejeitado"
    assert novo.usuario_id and novo.jornada_id == lead.id
    tl = client.get(f"/jornadas/{lead.id}/auditoria", headers=h).json()
    # a rejeição pode reabrir uma pendência logo depois; a linha do tempo mostra as duas
    registro = next(t for t in tl if t["acao"] == "rejeitar_item")
    assert registro["autor"] == "Marina Costa"


# --- funil e usuários -------------------------------------------------------------

def test_funil_da_diretoria_e_gestao_de_usuarios(client, entrar):
    d = entrar("diretoria")
    f = client.get("/painel/funil", headers=d).json()
    assert f["kpis"]["leads_no_funil"] == 9 and f["kpis"]["handoffs_aguardando_aceite"] == 1
    assert [e["etapa"] for e in f["funil"]][0] == "Nova reunião"
    assert client.get("/permissoes", headers=d).json()["aviso"]
    meu = client.get("/auth/me", headers=d).json()["id"]
    r = client.patch(f"/usuarios/{meu}", headers=d, json={"papel": "comercial"})
    assert r.status_code == 409  # não deixa a Diretoria sem conta
    convite = client.post("/usuarios/convidar", headers=d, json={"nome": "Zé", "email": "ze@seedabit.org.br"})
    assert convite.json()["status"] == "convidado"
