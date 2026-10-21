"""Extração com evidência (job assíncrono): IA propõe, o código valida.

G1 (EXTRAINDO -> EM_VALIDACAO): a saída passou no schema e na checagem de evidências.
Item sem trecho literal no segmento citado vira "inferido" e perde as evidências.
Schema inválido: até `extraction_max_repairs` reparos; depois, falha explícita.
"""

import time

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.llm import VERSAO_PROMPT_EXTRACAO, get_provider
from app.models import Item, Job, Jornada, Reuniao
from app.models.enums import (
    EstadoJornada,
    OrigemItem,
    ResultadoIA,
    SituacaoItem,
    StatusJob,
)
from app.schemas.extracao import ItemIA, SaidaExtracao
from app.services import auditoria, orquestrador, pendencias
from app.services.matriz import SEM_VALOR_DA_IA


def chave_idempotencia(reuniao: Reuniao) -> str:
    return f"{reuniao.id}:{VERSAO_PROMPT_EXTRACAO}:{reuniao.texto_hash}"


def enfileirar(db: Session, jornada: Jornada, reuniao: Reuniao, usuario) -> Job:
    """Cria (ou reaproveita) o job. "Tentar de novo" nunca duplica itens."""
    chave = chave_idempotencia(reuniao)
    job = db.scalar(select(Job).where(Job.chave_idempotencia == chave))
    if job is None:
        job = Job(jornada_id=jornada.id, tipo="extracao", chave_idempotencia=chave,
                  payload={"reuniao_id": reuniao.id}, versao_prompt=VERSAO_PROMPT_EXTRACAO)
        db.add(job)
    elif job.status == StatusJob.FALHOU:
        job.status = StatusJob.PENDENTE
        job.erro = None
        job.tentativas = 0
    db.flush()
    if jornada.estado == EstadoJornada.TRANSCRICAO_RECEBIDA or jornada.estado == EstadoJornada.FALHA_EXTRACAO:
        orquestrador.transitar(db, jornada, EstadoJornada.EXTRAINDO, usuario, "extração enfileirada")
    return job


def _checar_evidencias(item: ItemIA, segmentos: dict[int, dict]) -> list[dict]:
    """Mantém só evidência literal no segmento citado (no texto mascarado, que a IA viu)."""
    validas = []
    for ev in item.evidencias:
        seg = segmentos.get(ev.segmento_ordem)
        if seg and ev.trecho in seg["texto_mascarado"]:
            inicio = seg["texto_mascarado"].index(ev.trecho)
            validas.append({"segmento_ordem": ev.segmento_ordem, "trecho": ev.trecho,
                            "inicio": inicio, "fim": inicio + len(ev.trecho)})
    return validas


def executar(db: Session, job: Job) -> None:
    """Roda a extração de um job já reservado pelo worker. Commit é do chamador."""
    cfg = get_settings()
    reuniao = db.get(Reuniao, job.payload["reuniao_id"])
    jornada = db.get(Jornada, job.jornada_id)
    segmentos = {s["ordem"]: s for s in reuniao.segmentos}
    provider = get_provider()
    job.provedor = provider.nome

    saida, dica = None, ""
    inicio = time.monotonic()
    for tentativa in range(1 + cfg.extraction_max_repairs):
        resp = provider.extrair(reuniao.segmentos, VERSAO_PROMPT_EXTRACAO, dica)
        job.modelo = resp.modelo
        job.tokens_entrada += resp.tokens_entrada
        job.tokens_saida += resp.tokens_saida
        job.custo_estimado += resp.custo_estimado
        try:
            saida = SaidaExtracao.model_validate_json(resp.texto)
            break
        except ValidationError as e:
            dica = f"Saída anterior inválida: {e.errors()[0]['msg']}. Responda só o JSON do schema."
    job.latencia_ms = int((time.monotonic() - inicio) * 1000)

    if saida is None:
        job.status = StatusJob.FALHOU
        job.resultado_ia = ResultadoIA.SCHEMA_INVALIDO
        job.erro = "A IA não devolveu um resultado válido após os reparos."
        orquestrador.transitar(db, jornada, EstadoJornada.FALHA_EXTRACAO, None, job.erro)
        return

    for it in saida.itens:
        evidencias = _checar_evidencias(it, segmentos)
        explicita = bool(evidencias)
        descricao = it.descricao
        if it.categoria in SEM_VALOR_DA_IA and not explicita:
            continue  # orçamento e prazo nunca recebem valor da IA sem trecho no texto
        db.add(Item(
            jornada_id=jornada.id, reuniao_id=reuniao.id, job_id=job.id, categoria=it.categoria,
            descricao=descricao, natureza_proposta=it.natureza_proposta,
            origem=OrigemItem.EXPLICITA if explicita else OrigemItem.INFERIDA,
            situacao=SituacaoItem.INFORMADO, evidencias=evidencias,
        ))
    db.flush()
    job.status = StatusJob.CONCLUIDO
    job.resultado_ia = ResultadoIA.OK
    auditoria.registrar(db, None, "extracao_concluida", "reuniao", reuniao.id, jornada.id,
                        None, {"itens": len(saida.itens), "job_id": job.id})
    orquestrador.transitar(db, jornada, EstadoJornada.EM_VALIDACAO, None, "G1: schema e evidências ok")
    pendencias.sincronizar(db, jornada)


def falhar(db: Session, job: Job, erro: str) -> None:
    """Falha inesperada (exceção): registra e leva a jornada a FALHA_EXTRACAO."""
    job.status = StatusJob.FALHOU
    job.resultado_ia = ResultadoIA.ERRO
    job.erro = erro[:500]
    jornada = db.get(Jornada, job.jornada_id)
    if jornada and jornada.estado == EstadoJornada.EXTRAINDO:
        orquestrador.transitar(db, jornada, EstadoJornada.FALHA_EXTRACAO, None, "erro na extração")
