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
