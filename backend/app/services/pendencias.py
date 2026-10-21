"""Lacunas e pendências: a matriz de obrigatórios (configuração) gera pendências."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Item, Jornada, Pendencia, Usuario
from app.models.enums import (
    CategoriaItem,
    NaturezaItem,
    OrigemItem,
    SituacaoItem,
    StatusPendencia,
    StatusValidacao,
)
from app.services import auditoria
from app.services.erros import ErroNegocio, NaoEncontrado
from app.services.matriz import OBRIGATORIOS, TITULO_SECAO

ACOES = {"informar", "esclarecido", "aceitar_com_risco"}


def _categorias_cobertas(db: Session, jornada_id: int) -> set[CategoriaItem]:
    itens = db.scalars(
        select(Item).where(
            Item.jornada_id == jornada_id,
            Item.status_validacao != StatusValidacao.REJEITADO,
            Item.situacao == SituacaoItem.INFORMADO,
        )
    )
    return {i.categoria for i in itens}


def sincronizar(db: Session, jornada: Jornada, usuario: Usuario | None = None) -> None:
    """Cria pendência para cada obrigatório sem item e fecha as que passaram a ter item."""
    cobertas = _categorias_cobertas(db, jornada.id)
    existentes = {
        p.campo: p
        for p in db.scalars(select(Pendencia).where(Pendencia.jornada_id == jornada.id))
    }
    for categoria, severidade in OBRIGATORIOS.items():
        pend = existentes.get(categoria.value)
        if categoria in cobertas:
            if pend and pend.status == StatusPendencia.ABERTA:
                pend.status = StatusPendencia.RESOLVIDA
                auditoria.registrar(db, usuario, "resolver_pendencia", "pendencia", pend.id,
                                    jornada.id, {"status": "aberta"}, {"status": "resolvida", "via": "item"})
        elif pend is None:
            titulo = TITULO_SECAO[categoria].lower()
            nova = Pendencia(
                jornada_id=jornada.id,
                campo=categoria.value,
                descricao=f"O cliente não informou: {titulo}.",
                severidade=severidade,
                pergunta_sugerida=f"Pode nos contar mais sobre {titulo}?",
            )
            db.add(nova)
            db.flush()
            auditoria.registrar(db, usuario, "criar_pendencia", "pendencia", nova.id, jornada.id,
                                None, {"campo": nova.campo, "severidade": severidade.value})
        elif pend.status != StatusPendencia.ABERTA and categoria not in cobertas and pend.status == StatusPendencia.RESOLVIDA:
            # o item que resolvia foi rejeitado: a lacuna volta
            pend.status = StatusPendencia.ABERTA
            auditoria.registrar(db, usuario, "reabrir_pendencia", "pendencia", pend.id, jornada.id,
                                {"status": "resolvida"}, {"status": "aberta"})
    db.flush()


def obter(db: Session, pendencia_id: int) -> Pendencia:
    pend = db.get(Pendencia, pendencia_id)
    if not pend:
        raise NaoEncontrado("Pendência")
    return pend


def resolver(
    db: Session, pend: Pendencia, usuario: Usuario, acao: str,
    justificativa: str | None = None, descricao: str | None = None,
) -> Pendencia:
    if acao not in ACOES:
        raise ErroNegocio("Ação inválida. Use informar, esclarecido ou aceitar_com_risco.")
    if pend.status != StatusPendencia.ABERTA:
        raise ErroNegocio("Esta pendência já foi tratada.", 409)
    antes = {"status": pend.status.value}
    if acao == "informar":
        if not descricao or not descricao.strip():
            raise ErroNegocio("Informe o dado que faltava.")
        item = Item(
            jornada_id=pend.jornada_id,
            categoria=CategoriaItem(pend.campo),
            descricao=descricao.strip(),
            origem=OrigemItem.MANUAL,
            natureza_final=NaturezaItem.ACORDADO,
            status_validacao=StatusValidacao.CONFIRMADO,
            validado_por_id=usuario.id,
        )
        db.add(item)
        db.flush()
        auditoria.registrar(db, usuario, "adicionar_item", "item", item.id, pend.jornada_id,
                            None, {"categoria": pend.campo, "via": "pendencia"})
        pend.status = StatusPendencia.RESOLVIDA
    elif acao == "esclarecido":
        pend.status = StatusPendencia.ESCLARECIDA
        pend.justificativa = justificativa
    else:
        if not justificativa or not justificativa.strip():
            raise ErroNegocio("Aceitar com risco exige uma justificativa.")
        pend.status = StatusPendencia.ACEITA_COM_RISCO
        pend.justificativa = justificativa.strip()
    auditoria.registrar(db, usuario, f"pendencia_{acao}", "pendencia", pend.id, pend.jornada_id,
                        antes, {"status": pend.status.value, "justificativa": pend.justificativa})
    return pend
