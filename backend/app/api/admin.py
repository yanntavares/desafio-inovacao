"""Telas da Diretoria: usuários, permissões, funil e auditoria (+ recarga da demonstração)."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import usuario_atual
from app.core.config import get_settings
from app.core.database import get_db
from app.models import Usuario
from app.schemas.api import ConviteIn, UsuarioPatch
from app.services import painel, permissoes, usuarios
from app.services.erros import NaoEncontrado
from app.services.permissoes import Acao

router = APIRouter(tags=["diretoria"])


@router.get("/usuarios")
def listar_usuarios(user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    permissoes.exigir(user, Acao.GERENCIAR_USUARIOS)
    return [usuarios.serializar(u) for u in usuarios.listar(db)]


@router.get("/usuarios/opcoes")
def opcoes(user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    """Seletores (analista responsável, gerente, filtros): qualquer usuário logado."""
    return [{"id": u.id, "nome": u.nome, "papel": u.papel.value}
            for u in usuarios.listar(db) if u.ativo and u.senha_hash]


@router.post("/usuarios/convidar", status_code=201)
def convidar(dados: ConviteIn, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    novo = usuarios.convidar(db, user, dados.nome, dados.email, dados.papel)
    db.commit()
    return usuarios.serializar(novo)


@router.patch("/usuarios/{usuario_id}")
def atualizar_usuario(usuario_id: int, dados: UsuarioPatch, user: Usuario = Depends(usuario_atual),
                      db: Session = Depends(get_db)):
    alvo = usuarios.atualizar(db, user, usuario_id, dados.papel, dados.ativo)
    db.commit()
    return usuarios.serializar(alvo)


@router.get("/permissoes")
def matriz_permissoes(user: Usuario = Depends(usuario_atual)):
    return painel.permissoes_por_perfil()


@router.get("/painel/funil")
def funil(dias: int = 30, analista_id: int | None = None, gerente_id: int | None = None,
          user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    return painel.funil(db, user, dias=dias, analista_id=analista_id, gerente_id=gerente_id)


@router.get("/auditoria")
def auditoria(jornada_id: int | None = None, usuario_id: int | None = None, acao: str | None = None,
              limite: int = 100, user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    return painel.auditoria_global(db, user, jornada_id=jornada_id, usuario_id=usuario_id,
                                   acao=acao, limite=limite)


@router.post("/demo/recarregar")
def recarregar_demo(user: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    permissoes.exigir(user, Acao.GERENCIAR_USUARIOS)
    if not get_settings().demo_mode:
        raise NaoEncontrado("Modo demonstração")
    from app.seed import recarregar
    recarregar(db)
    return {"ok": True, "usuarios": db.scalar(select(func.count(Usuario.id)))}
