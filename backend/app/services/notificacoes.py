"""Sino da topbar: eventos de auditoria relevantes para o papel, sem tabela própria."""

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models import Auditoria, Jornada, Usuario
from app.models.base import agora
from app.models.enums import EstadoJornada as E
from app.models.enums import Papel

TEXTOS = {
    "devolver_handoff": "O gerente devolveu o handoff de {cliente}.",
    "aceitar_handoff": "O handoff de {cliente} foi aceito.",
    "enviar_handoff": "Você recebeu o handoff de {cliente}.",
    E.EM_VALIDACAO.value: "Extração concluída em {cliente}: a ficha aguarda sua validação.",
    E.FALHA_EXTRACAO.value: "A extração de {cliente} falhou. Tente de novo.",
    "criar_conta": "Nova conta: {email}. Entrou como analista; ajuste o perfil se precisar.",
}


def _filtro(usuario: Usuario):
    if usuario.papel == Papel.COMERCIAL:
        sistema = and_(Auditoria.acao == "mudar_estado", Auditoria.usuario_id.is_(None))
        return and_(Jornada.responsavel_id == usuario.id,
                    or_(Auditoria.acao.in_(["devolver_handoff", "aceitar_handoff"]), sistema))
    if usuario.papel == Papel.GERENTE:
        return and_(Jornada.gerente_id == usuario.id, Auditoria.acao == "enviar_handoff")
    if usuario.papel == Papel.ADMIN:
        return Auditoria.acao == "criar_conta"
    return None


def _texto(a: Auditoria, j: Jornada | None) -> str | None:
    if a.acao == "mudar_estado":
        chave = (a.depois or {}).get("estado")
        return TEXTOS[chave].format(cliente=j.cliente_nome) if chave in TEXTOS else None
    if a.acao == "criar_conta":
        return TEXTOS[a.acao].format(email=(a.depois or {}).get("email", "?"))
    return TEXTOS[a.acao].format(cliente=j.cliente_nome)


def listar(db: Session, usuario: Usuario, limite: int = 30) -> dict:
    filtro = _filtro(usuario)
    if filtro is None:
        return {"itens": [], "nao_lidas": 0}
    rows = db.execute(
        select(Auditoria, Jornada).outerjoin(Jornada, Jornada.id == Auditoria.jornada_id)
        .where(filtro, or_(Auditoria.usuario_id.is_(None), Auditoria.usuario_id != usuario.id))
        .order_by(Auditoria.id.desc()).limit(limite * 3)  # mudar_estado irrelevante é descartado abaixo
    )
    itens = []
    for a, j in rows:
        texto = _texto(a, j)
        if texto and len(itens) < limite:
            itens.append({"id": a.id, "quando": a.criado_em.isoformat(), "texto": texto,
                          "jornada_id": a.jornada_id, "lida": _lida(usuario, a)})
    return {"itens": itens, "nao_lidas": sum(1 for i in itens if not i["lida"])}


def _lida(usuario: Usuario, a: Auditoria) -> bool:
    if not usuario.notificacoes_lidas_em:
        return False
    # SQLite devolve datetime sem fuso; compara pelo relógio de parede
    return a.criado_em.replace(tzinfo=None) <= usuario.notificacoes_lidas_em.replace(tzinfo=None)


def marcar_lidas(usuario: Usuario) -> None:
    usuario.notificacoes_lidas_em = agora()
