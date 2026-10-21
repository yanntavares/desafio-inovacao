from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import usuario_atual
from app.core.config import get_settings
from app.core.database import get_db
from app.models import Usuario
from app.models.enums import Papel
from app.schemas.api import CadastroIn, DemoIn, LoginIn
from app.services import seguranca, usuarios
from app.services.erros import ErroNegocio, NaoEncontrado

router = APIRouter(prefix="/auth", tags=["auth"])


def _sessao(user: Usuario) -> dict:
    return {"token": seguranca.criar_token(user.id), "usuario": usuarios.serializar(user)}


@router.post("/cadastro", status_code=201)
def cadastro(dados: CadastroIn, db: Session = Depends(get_db)):
    user = usuarios.cadastrar_conta(db, dados.nome, dados.email, dados.senha,
                                    dados.confirmar_senha, dados.aceite_lgpd)
    db.commit()
    return _sessao(user)


@router.post("/login")
def login(dados: LoginIn, db: Session = Depends(get_db)):
    try:
        return _sessao(usuarios.autenticar(db, dados.email, dados.senha))
    except ErroNegocio:
        db.commit()  # a tentativa falha fica registrada (conta para o bloqueio)
        raise


@router.post("/renovar")
def renovar(user: Usuario = Depends(usuario_atual)):
    """Token ainda válido → token novo, contando a expiração a partir de agora."""
    return _sessao(user)


@router.get("/me")
def me(user: Usuario = Depends(usuario_atual)):
    return usuarios.serializar(user)


def _exigir_demo() -> None:
    if not get_settings().demo_mode:
        raise NaoEncontrado("Modo demonstração")


@router.get("/demo")
def perfis_demo(db: Session = Depends(get_db)):
    """Perfis fictícios para a tela de login (só com DEMO_MODE ligado)."""
    _exigir_demo()
    rotulos = {Papel.COMERCIAL: "vê só os seus leads", Papel.GERENTE: "vê todos os leads",
               Papel.ADMIN: "Conta administradora única"}
    out = []
    for papel in (Papel.COMERCIAL, Papel.GERENTE, Papel.ADMIN):
        u = db.scalar(select(Usuario).where(Usuario.papel == papel, Usuario.ativo.is_(True)).order_by(Usuario.id))
        if u:
            out.append({**usuarios.serializar(u), "descricao": rotulos[papel]})
    return out


@router.post("/demo")
def entrar_demo(dados: DemoIn, db: Session = Depends(get_db)):
    _exigir_demo()
    user = db.scalar(select(Usuario).where(Usuario.papel == dados.papel, Usuario.ativo.is_(True))
                     .order_by(Usuario.id))
    if not user:
        raise ErroNegocio("Perfil de demonstração indisponível. Recarregue a demonstração.", 404)
    return _sessao(user)
