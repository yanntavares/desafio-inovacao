"""Revisão humana (G2): confirmar, editar, rejeitar e adicionar item.

Natureza final só muda por ação humana explícita; a IA só propõe.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Item, Jornada, Usuario
from app.models.enums import (
    CategoriaItem,
    EstadoJornada,
    NaturezaItem,
    OrigemItem,
    SituacaoItem,
    StatusValidacao,
)
from app.services import auditoria, pendencias
from app.services.erros import ErroNegocio, NaoEncontrado

ACOES = {"confirmar", "editar", "rejeitar"}


def obter(db: Session, item_id: int) -> Item:
    item = db.get(Item, item_id)
    if not item:
        raise NaoEncontrado("Item")
    return item


def _exigir_em_validacao(jornada: Jornada) -> None:
    if jornada.estado != EstadoJornada.EM_VALIDACAO:
        raise ErroNegocio("Os itens só podem ser alterados com a jornada em validação.", 409)


def _snapshot(item: Item) -> dict:
    return {
        "descricao": item.descricao,
        "categoria": item.categoria.value,
        "natureza_final": item.natureza_final.value if item.natureza_final else None,
        "status_validacao": item.status_validacao.value,
    }


def revisar(
    db: Session, item: Item, jornada: Jornada, usuario: Usuario, acao: str,
    natureza_final: NaturezaItem | None = None, descricao: str | None = None,
    categoria: CategoriaItem | None = None,
) -> Item:
    if acao not in ACOES:
        raise ErroNegocio("Ação inválida. Use confirmar, editar ou rejeitar.")
    _exigir_em_validacao(jornada)
    antes = _snapshot(item)
    if acao == "rejeitar":
        item.status_validacao = StatusValidacao.REJEITADO
    else:
        if natureza_final is None:
            # a IA nunca decide: quem confirma ou edita escolhe a natureza explicitamente
            raise ErroNegocio("Escolha a natureza do item (acordado, em discussão ou sugestão da IA).")
        if acao == "editar":
            if not descricao or not descricao.strip():
                raise ErroNegocio("Informe o novo texto do item.")
            item.descricao = descricao.strip()
            if categoria:
                item.categoria = categoria
        item.natureza_final = natureza_final
        item.status_validacao = StatusValidacao.CONFIRMADO if acao == "confirmar" else StatusValidacao.EDITADO
    item.validado_por_id = usuario.id
    auditoria.registrar(db, usuario, f"{acao}_item", "item", item.id, jornada.id, antes, _snapshot(item))
    pendencias.sincronizar(db, jornada, usuario)
    return item


def adicionar(
    db: Session, jornada: Jornada, usuario: Usuario, categoria: CategoriaItem,
    descricao: str, natureza_final: NaturezaItem,
) -> Item:
    _exigir_em_validacao(jornada)
    if not descricao.strip():
        raise ErroNegocio("Descreva o item.")
    item = Item(
        jornada_id=jornada.id, categoria=categoria, descricao=descricao.strip(),
        origem=OrigemItem.MANUAL, natureza_final=natureza_final, situacao=SituacaoItem.INFORMADO,
        status_validacao=StatusValidacao.CONFIRMADO, validado_por_id=usuario.id,
    )
    db.add(item)
    db.flush()
    auditoria.registrar(db, usuario, "adicionar_item", "item", item.id, jornada.id, None, _snapshot(item))
    pendencias.sincronizar(db, jornada, usuario)
    return item


def listar(db: Session, jornada_id: int) -> list[Item]:
    return list(db.scalars(select(Item).where(Item.jornada_id == jornada_id).order_by(Item.id)))
