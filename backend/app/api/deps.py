"""Dependências comuns dos routers: sessão e usuário autenticado."""

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Usuario
from app.services import usuarios
from app.services.erros import ErroNegocio


def usuario_atual(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> Usuario:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ErroNegocio("Entre para continuar.", 401, "nao_autenticado")
    return usuarios.usuario_do_token(db, authorization[7:].strip())
