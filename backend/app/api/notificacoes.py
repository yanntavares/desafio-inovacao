"""Sino da topbar."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import usuario_atual
from app.core.database import get_db
from app.models import Usuario
from app.services import notificacoes

router = APIRouter(prefix="/notificacoes", tags=["notificações"])


@router.get("")
def listar(user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    return notificacoes.listar(db, user)


@router.post("/lidas")
def marcar_lidas(user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    notificacoes.marcar_lidas(user)
    db.commit()
    return {"nao_lidas": 0}
