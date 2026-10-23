"""Pacote de handoff: snapshot imutável de 16 seções (acordado x em discussão) + G3.

Uma nova versão só nasce depois de uma devolução; o `hash` identifica a versão aceita.
"""

import hashlib
import json

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Aprovacao, Item, Jornada, PacoteHandoff, Usuario
from app.models.base import agora
from app.models.enums import (
    DecisaoAprovacao,
    EstadoJornada,
    Gate,
    NaturezaItem,
    Papel,
    StatusValidacao,
)
from app.services import auditoria, orquestrador, permissoes
from app.services.erros import ErroNegocio, NaoEncontrado, SemPermissao
from app.services.matriz import SECOES, TITULO_SECAO
from app.services.permissoes import Acao


def montar_secoes(db: Session, jornada_id: int) -> dict:
    itens = list(db.scalars(select(Item).where(Item.jornada_id == jornada_id).order_by(Item.id)))
    secoes = {}
    for cat in SECOES:
        s = {"titulo": TITULO_SECAO[cat], "acordado": [], "em_discussao": [], "sugestao_ia": [],
             "preenchida": False}
        for it in itens:
            if it.categoria != cat or it.status_validacao == StatusValidacao.REJEITADO:
                continue
            ref = {"id": it.id, "descricao": it.descricao, "origem": it.origem.value}
            if it.status_validacao in (StatusValidacao.CONFIRMADO, StatusValidacao.EDITADO):
                nat = it.natureza_final or NaturezaItem.EM_DISCUSSAO
                s["acordado" if nat == NaturezaItem.ACORDADO
                  else "em_discussao" if nat == NaturezaItem.EM_DISCUSSAO else "sugestao_ia"].append(ref)
            else:
                s["sugestao_ia"].append(ref)  # ainda não decidido por pessoa
        s["preenchida"] = bool(s["acordado"] or s["em_discussao"])
        secoes[cat.value] = s
    return secoes


def resumo(secoes: dict, bloqueantes: int) -> dict:
    preenchidas = sum(1 for s in secoes.values() if s["preenchida"])
    return {
        "acordados": sum(len(s["acordado"]) for s in secoes.values()),
        "em_discussao": sum(len(s["em_discussao"]) for s in secoes.values()),
        "bloqueantes": bloqueantes,
        "secoes_preenchidas": preenchidas,
        "secoes_total": len(secoes),
        "faltam": [s["titulo"] for s in secoes.values() if not s["preenchida"]],
    }


def _hash(secoes: dict) -> str:
    return hashlib.sha256(json.dumps(secoes, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def obter(db: Session, pacote_id: int) -> PacoteHandoff:
    pacote = db.get(PacoteHandoff, pacote_id)
    if not pacote:
        raise NaoEncontrado("Pacote")
    return pacote


def listar(db: Session, jornada_id: int) -> list[PacoteHandoff]:
    return list(db.scalars(select(PacoteHandoff).where(PacoteHandoff.jornada_id == jornada_id)
                           .order_by(PacoteHandoff.versao)))


def ultimo(db: Session, jornada_id: int) -> PacoteHandoff | None:
    return db.scalar(select(PacoteHandoff).where(PacoteHandoff.jornada_id == jornada_id)
                     .order_by(PacoteHandoff.versao.desc()).limit(1))


def enviar(db: Session, jornada: Jornada, usuario: Usuario, gerente_id: int) -> PacoteHandoff:
    """Gera o snapshot e envia ao gerente: VALIDADA -> HANDOFF_ENVIADO."""
    permissoes.exigir(usuario, Acao.ENVIAR_HANDOFF)
    if jornada.responsavel_id != usuario.id:
        raise SemPermissao("Este lead pertence a outro analista.")
    if jornada.estado != EstadoJornada.VALIDADA:
        raise ErroNegocio("O handoff só é enviado com a jornada validada (G2).", 409)
    gerente = db.get(Usuario, gerente_id)
    if not gerente or gerente.papel != Papel.GERENTE or not gerente.ativo:
        raise ErroNegocio("Escolha um gerente de projetos ativo.")
    secoes = montar_secoes(db, jornada.id)
    bloq = orquestrador.pendencias_bloqueantes_abertas(db, jornada.id)
    versao = (db.scalar(select(func.max(PacoteHandoff.versao))
                        .where(PacoteHandoff.jornada_id == jornada.id)) or 0) + 1
    r = resumo(secoes, bloq)
    pacote = PacoteHandoff(
        jornada_id=jornada.id, versao=versao, secoes=secoes, hash=_hash(secoes),
        indice_completude=round(r["secoes_preenchidas"] / r["secoes_total"], 4),
        gerente_id=gerente.id, enviado_em=agora(),
    )
    db.add(pacote)
    db.flush()
    jornada.gerente_id = gerente.id
    auditoria.registrar(db, usuario, "enviar_handoff", "pacote_handoff", pacote.id, jornada.id, None,
                        {"versao": versao, "hash": pacote.hash, "gerente_id": gerente.id})
    orquestrador.transitar(db, jornada, EstadoJornada.HANDOFF_ENVIADO, usuario, f"handoff v{versao}")
    return pacote


def aceitar(db: Session, jornada: Jornada, usuario: Usuario, versao: int) -> PacoteHandoff:
    """G3: o gerente designado confirma uma versão específica do pacote."""
    orquestrador.exigir_gate(db, Gate.G3, jornada, usuario)
    pacote = ultimo(db, jornada.id)
    if not pacote or pacote.versao != versao:
        raise ErroNegocio("Esta não é a versão mais recente do pacote. Atualize a tela e confira.", 409)
    db.add(Aprovacao(jornada_id=jornada.id, gate=Gate.G3, decisao=DecisaoAprovacao.ACEITO,
                     usuario_id=usuario.id, pacote_id=pacote.id))
    auditoria.registrar(db, usuario, "aceitar_handoff", "pacote_handoff", pacote.id, jornada.id,
                        None, {"versao": pacote.versao, "hash": pacote.hash})
    orquestrador.transitar(db, jornada, EstadoJornada.ACEITO, usuario, f"G3: aceitou v{pacote.versao}")
    return pacote


def devolver(db: Session, jornada: Jornada, usuario: Usuario, comentario: str) -> PacoteHandoff:
    orquestrador.exigir_gate(db, Gate.G3, jornada, usuario)
    if not comentario or not comentario.strip():
        raise ErroNegocio("Devolver exige um comentário para o analista.")
    pacote = ultimo(db, jornada.id)
    db.add(Aprovacao(jornada_id=jornada.id, gate=Gate.G3, decisao=DecisaoAprovacao.DEVOLVIDO,
                     usuario_id=usuario.id, pacote_id=pacote.id, comentario=comentario.strip()))
    auditoria.registrar(db, usuario, "devolver_handoff", "pacote_handoff", pacote.id, jornada.id,
                        None, {"versao": pacote.versao, "comentario": comentario.strip()})
    orquestrador.transitar(db, jornada, EstadoJornada.EM_VALIDACAO, usuario, "devolvido pelo gerente")
    return pacote


def ultima_devolucao(db: Session, jornada: Jornada) -> Aprovacao | None:
    """Comentário do gerente para a faixa no topo da jornada devolvida."""
    if jornada.estado != EstadoJornada.EM_VALIDACAO:
        return None
    return db.scalar(select(Aprovacao).where(
        Aprovacao.jornada_id == jornada.id, Aprovacao.decisao == DecisaoAprovacao.DEVOLVIDO
    ).order_by(Aprovacao.id.desc()).limit(1))
