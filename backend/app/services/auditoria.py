"""Toda ação relevante grava ator, ação, antes, depois e hora na MESMA transação.

As funções só fazem `add`/`flush`; quem commita é o chamador (o endpoint ou o worker),
de modo que ação e auditoria entram juntas ou não entram.
"""

from sqlalchemy.orm import Session

from app.models import Auditoria, Usuario


def registrar(
    db: Session,
    usuario: Usuario | None,  # None = Sistema (worker)
    acao: str,
    entidade: str,
    entidade_id: int | None = None,
    jornada_id: int | None = None,
    antes: dict | None = None,
    depois: dict | None = None,
) -> Auditoria:
    reg = Auditoria(
        jornada_id=jornada_id,
        usuario_id=usuario.id if usuario else None,
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        antes=antes,
        depois=depois,
    )
    db.add(reg)
    db.flush()
    return reg


def registrar_recusa(db: Session, usuario_id: int, metodo: str, rota: str, jornada_id: int | None,
                     status: int, mensagem: str) -> None:
    """Tentativa recusada (403/409). Transação própria: a ação foi desfeita, o registro fica."""
    db.add(Auditoria(jornada_id=jornada_id, usuario_id=usuario_id, acao="acao_recusada", entidade="requisicao",
                     depois={"metodo": metodo, "rota": rota, "status": status, "mensagem": mensagem}))
    db.flush()
