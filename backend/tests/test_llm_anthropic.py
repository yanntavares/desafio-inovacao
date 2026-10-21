"""AnthropicProvider com cliente falso: o que vai à API, o que volta, custo e logs. Nenhuma chamada paga."""

import json
import logging
from types import SimpleNamespace

import anthropic
import httpx
import pytest
from sqlalchemy import select

from app import worker
from app.llm.anthropic import AnthropicProvider
from app.llm.base import PROMPTS
from app.models import Job, Jornada, Usuario
from app.models.enums import EstadoJornada, StatusJob
from app.services import extracao, jornadas
from app.services.erros import ErroIA

ORIGINAL = "Helena: O problema é que os alunos não conseguem rever as aulas. Meu e-mail é helena@cliente.com."


class ClienteFalso:
    def __init__(self, texto="{}", stop_reason="end_turn", erro=None, modelo="claude-sonnet-5-5"):
        self.chamadas, self.texto, self.stop_reason, self.erro, self.modelo = [], texto, stop_reason, erro, modelo
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.chamadas.append(kwargs)
        if self.erro:
            raise self.erro
        return SimpleNamespace(
            stop_reason=self.stop_reason, model=self.modelo,
            stop_details=SimpleNamespace(category="cyber") if self.stop_reason == "refusal" else None,
            content=[SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=self.texto)],
            usage=SimpleNamespace(input_tokens=1000, output_tokens=500),
        )


def _segmentos():
    from app.services import transcricao
    return transcricao.processar(ORIGINAL, "colado")["segmentos"]


def test_extracao_manda_so_texto_mascarado_e_delimitado():
    falso = ClienteFalso(texto='{"itens": []}')
    resp = AnthropicProvider(client=falso).extrair(_segmentos(), "extracao_v1", "Saída anterior inválida.")
    kw = falso.chamadas[0]
    assert kw["model"] == "claude-sonnet-5-5" and kw["max_tokens"] == 16000
    assert kw["fallbacks"] == "default" and "tools" not in kw
    assert kw["output_config"]["format"]["type"] == "json_schema"
    assert kw["system"] == (PROMPTS / "extracao_v1.md").read_text(encoding="utf-8")
    conteudo = kw["messages"][0]["content"]
    assert conteudo.startswith("<transcricao>\n") and "[EMAIL_1]" in conteudo
    assert conteudo.index("</transcricao>") < conteudo.index("Saída anterior inválida.")
    assert "helena@cliente.com" not in json.dumps(kw, ensure_ascii=False)
    # Sonnet 5.5: US$ 2 / 10 por milhão
    assert (resp.tokens_entrada, resp.tokens_saida) == (1000, 500)
    assert resp.custo_estimado == pytest.approx((1000 * 2 + 500 * 10) / 1e6)
    assert resp.texto == '{"itens": []}'


@pytest.mark.parametrize(("stop_reason", "trecho"), [("refusal", "cyber"), ("max_tokens", "LLM_MAX_TOKENS")])
def test_recusa_e_resposta_cortada_viram_erro_claro(stop_reason, trecho):
    with pytest.raises(ErroIA) as e:
        AnthropicProvider(client=ClienteFalso(stop_reason=stop_reason)).extrair(_segmentos(), "extracao_v1")
    assert trecho in e.value.mensagem and e.value.status == 502


def test_erro_de_conexao_vira_erro_ia():
    erro = anthropic.APIConnectionError(request=httpx.Request("POST", "https://api.anthropic.com/v1/messages"))
    with pytest.raises(ErroIA):
        AnthropicProvider(client=ClienteFalso(erro=erro)).redigir("briefing_comercial", {"cliente": "X", "itens": {}})


def _reuniao_em_extracao(client, db, entrar) -> Jornada:
    marina = db.scalar(select(Usuario).where(Usuario.email == "marina.costa@seedabit.org.br"))
    r = client.post("/reunioes", headers=entrar("marina.costa"), data={
        "cliente_nome": "Lead IA", "titulo_negocio": "Site", "analista_id": marina.id,
        "data_reuniao": "2026-10-21", "tipo": "exploratoria",
        "participantes": json.dumps([{"nome": "Marina", "cliente": False}]), "texto": ORIGINAL})
    assert r.status_code == 201, r.text
    return db.get(Jornada, r.json()["jornada_id"])


def test_worker_registra_custo_e_nao_loga_a_transcricao(client, db, entrar, monkeypatch, caplog):
    j = _reuniao_em_extracao(client, db, entrar)
    saida = json.dumps({"itens": [{"categoria": "problema", "descricao": "Alunos não revêem aulas",
                                   "natureza_proposta": "em_discussao", "evidencias": [
                                       {"segmento_ordem": 1, "trecho": "os alunos não conseguem rever as aulas"}]}]})
    monkeypatch.setattr(extracao, "get_provider", lambda: AnthropicProvider(client=ClienteFalso(texto=saida)))
    job = db.scalar(select(Job).where(Job.jornada_id == j.id))
    job.status = StatusJob.EXECUTANDO
    with caplog.at_level(logging.DEBUG):
        worker.processar(db, job)
    assert j.estado == EstadoJornada.EM_VALIDACAO
    assert job.provedor == "anthropic" and job.tokens_entrada == 1000 and job.custo_estimado > 0
    assert jornadas.uso_ia(db, j.id)["custo_estimado"] > 0

    # falha da IA numa segunda reunião: jornada vai a FALHA_EXTRACAO e o log não traz o texto
    erro = anthropic.APIConnectionError(request=httpx.Request("POST", "https://api.anthropic.com/v1/messages"))
    outra = client.post("/reunioes", headers=entrar("marina.costa"), data={
        "jornada_id": j.id, "titulo_negocio": "Site", "analista_id": j.responsavel_id,
        "data_reuniao": "2026-10-22", "tipo": "aprofundamento",
        "participantes": json.dumps([{"nome": "Marina", "cliente": False}]), "texto": ORIGINAL + " Segunda."})
    assert outra.status_code == 201, outra.text
    monkeypatch.setattr(extracao, "get_provider", lambda: AnthropicProvider(client=ClienteFalso(erro=erro)))
    job2 = db.scalar(select(Job).where(Job.jornada_id == j.id, Job.status == StatusJob.PENDENTE))
    job2.status = StatusJob.EXECUTANDO
    with caplog.at_level(logging.DEBUG):
        worker.processar(db, job2)
    assert j.estado == EstadoJornada.FALHA_EXTRACAO and "conexão" in job2.erro
    assert "alunos não conseguem" not in caplog.text and "helena" not in caplog.text.lower()


def test_documento_gerado_registra_chamada_de_ia(client, db, entrar):
    folha = db.scalar(select(Jornada).where(Jornada.cliente_nome == "Rede Folha"))
    antes = jornadas.uso_ia(db, folha.id)["chamadas"]
    r = client.post(f"/jornadas/{folha.id}/documentos", headers=entrar("camila.reis"),
                    json={"tipo": "briefing_projeto"})
    assert r.status_code == 201, r.text
    redacao = db.scalars(select(Job).where(Job.jornada_id == folha.id, Job.tipo == "redacao")).all()
    assert redacao and all(j.status == StatusJob.CONCLUIDO and j.provedor == "mock" for j in redacao)
    ia = client.get(f"/jornadas/{folha.id}", headers=entrar("camila.reis")).json()["ia"]
    assert ia["chamadas"] == antes + 1
