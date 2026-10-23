"""Contas: cadastro, login, convite e gestão de perfis (Diretoria)."""

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Auditoria, Usuario
from app.models.base import agora
from app.models.enums import Papel
from app.services import auditoria, permissoes, seguranca
from app.services.erros import ErroNegocio, NaoEncontrado, SemPermissao
from app.services.permissoes import ROTULO_PAPEL, Acao

MSG_LOGIN = "E-mail ou senha incorretos."


def status(u: Usuario) -> str:
    if not u.ativo:
        return "inativo"
    return "ativo" if u.senha_hash else "convidado"


def serializar(u: Usuario) -> dict:
    return {"id": u.id, "nome": u.nome, "email": u.email, "papel": u.papel.value,
            "perfil": ROTULO_PAPEL[u.papel], "status": status(u)}


def _validar_email(email: str) -> str:
    email = email.strip().lower()
    dominio = get_settings().email_dominio
    if not email.endswith(f"@{dominio}"):
        raise ErroNegocio(f"Use o e-mail institucional (@{dominio}).")
    return email


def cadastrar_conta(db: Session, nome: str, email: str, senha: str, confirmar: str, aceite_lgpd: bool) -> Usuario:
    """Cria a conta. Perfil inicial = analista; só a Diretoria muda perfil depois.

    E-mail previamente convidado completa o cadastro e mantém o perfil do convite.
    """
    email = _validar_email(email)
    if not nome.strip():
        raise ErroNegocio("Informe o nome completo.")
    if senha != confirmar:
        raise ErroNegocio("As senhas não conferem.")
    seguranca.validar_forca_senha(senha)
    if not aceite_lgpd:
        raise ErroNegocio("É preciso concordar com o tratamento de dados (LGPD) para criar a conta.")
    existente = db.scalar(select(Usuario).where(Usuario.email == email))
    if existente and existente.senha_hash:
        raise ErroNegocio("Já existe uma conta com este e-mail.", 409)
    if existente:
        user, antes = existente, "convidado"
        user.nome = nome.strip()
    else:
        user, antes = Usuario(nome=nome.strip(), email=email, papel=Papel.COMERCIAL), None
        db.add(user)
    user.senha_hash = seguranca.hash_senha(senha)
    user.aceite_lgpd_em = agora()
    db.flush()
    auditoria.registrar(db, user, "criar_conta", "usuario", user.id, None, {"status": antes},
                        {"email": user.email, "papel": user.papel.value})
    return user


def autenticar(db: Session, email: str, senha: str) -> Usuario:
    """Falha de senha vira auditoria (sem tabela nova) e conta para o bloqueio. O chamador commita."""
    user = db.scalar(select(Usuario).where(Usuario.email == email.strip().lower()))
    if not user:
        raise ErroNegocio(MSG_LOGIN, 401, "nao_autenticado")  # mesma mensagem: não revela quem existe
    cfg = get_settings()
    # ponytail: login certo não zera o contador; a janela expira sozinha. Zerar ao logar, se precisar.
    falhas = db.scalar(select(func.count(Auditoria.id)).where(
        Auditoria.acao == "login_falhou", Auditoria.entidade_id == user.id,
        Auditoria.criado_em >= agora() - timedelta(minutes=cfg.login_janela_minutos))) or 0
    if falhas >= cfg.login_max_tentativas:
        raise ErroNegocio(f"Muitas tentativas. Aguarde {cfg.login_janela_minutos} minutos ou fale com a Diretoria.",
                          429, "login_bloqueado")
    if not user.ativo or not seguranca.verificar_senha(senha, user.senha_hash):
        auditoria.registrar(db, None, "login_falhou", "usuario", user.id)
        raise ErroNegocio(MSG_LOGIN, 401, "nao_autenticado")
    return user


def usuario_do_token(db: Session, token: str) -> Usuario:
    user = db.get(Usuario, seguranca.ler_token(token))
    if not user or not user.ativo:
        raise ErroNegocio("Sessão inválida ou expirada. Entre novamente.", 401, "nao_autenticado")
    return user


def listar(db: Session) -> list[Usuario]:
    return list(db.scalars(select(Usuario).order_by(Usuario.nome)))


def convidar(db: Session, ator: Usuario, nome: str, email: str, papel: Papel) -> Usuario:
    permissoes.exigir(ator, Acao.GERENCIAR_USUARIOS)
    email = _validar_email(email)
    if db.scalar(select(Usuario).where(Usuario.email == email)):
        raise ErroNegocio("Já existe um usuário com este e-mail.", 409)
    user = Usuario(nome=nome.strip(), email=email, papel=papel)
    db.add(user)
    db.flush()
    auditoria.registrar(db, ator, "convidar_usuario", "usuario", user.id, None, None,
                        {"email": email, "papel": papel.value})
    return user


def atualizar(db: Session, ator: Usuario, user_id: int, papel: Papel | None, ativo: bool | None) -> Usuario:
    permissoes.exigir(ator, Acao.GERENCIAR_USUARIOS)
    user = db.get(Usuario, user_id)
    if not user:
        raise NaoEncontrado("Usuário")
    antes = {"papel": user.papel.value, "ativo": user.ativo}
    novo_papel = papel or user.papel
    novo_ativo = user.ativo if ativo is None else ativo
    if user.papel == Papel.ADMIN and (novo_papel != Papel.ADMIN or not novo_ativo):
        restantes = db.scalar(select(func.count(Usuario.id)).where(
            Usuario.papel == Papel.ADMIN, Usuario.ativo.is_(True), Usuario.id != user.id)) or 0
        if not restantes:
            raise ErroNegocio("A Diretoria precisa de ao menos uma conta ativa.", 409)
    if user.id == ator.id and novo_papel != user.papel:
        # a própria sessão perderia o acesso às telas da Diretoria no meio do uso
        raise SemPermissao("Peça a outra conta da Diretoria para mudar o seu perfil.")
    user.papel, user.ativo = novo_papel, novo_ativo
    auditoria.registrar(db, ator, "atualizar_usuario", "usuario", user.id, None, antes,
                        {"papel": user.papel.value, "ativo": user.ativo})
    return user
