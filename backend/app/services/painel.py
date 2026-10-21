"""Visão geral do funil (Diretoria e gerentes) e leitura de auditoria."""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Auditoria, Jornada, Usuario
from app.models.base import agora
from app.models.enums import EstadoJornada as E
from app.services import jornadas, orquestrador, permissoes
from app.services.permissoes import Acao


def funil(db: Session, usuario: Usuario, *, dias: int = 30, analista_id: int | None = None,
          gerente_id: int | None = None) -> dict:
    permissoes.exigir(usuario, Acao.VER_PAINEL)
    q = select(Jornada)
    if dias:
        q = q.where(Jornada.criado_em >= agora() - timedelta(days=dias))
    if analista_id:
        q = q.where(Jornada.responsavel_id == analista_id)
    if gerente_id:
        q = q.where(Jornada.gerente_id == gerente_id)
    todas = list(db.scalars(q.order_by(Jornada.atualizado_em.desc())))
    ativas = [j for j in todas if j.estado != E.CONCLUIDA]
    nomes = {u.id: u.nome for u in db.scalars(select(Usuario))}
    etapas = [{"etapa": nome, "total": sum(1 for j in ativas if j.estado in estados)}
              for nome, estados in jornadas.ETAPAS if nome != "Concluída"]
    return {
        "kpis": {
            "leads_no_funil": len(ativas),
            "em_validacao": sum(1 for j in ativas if j.estado == E.EM_VALIDACAO),
            "handoffs_aguardando_aceite": sum(1 for j in ativas if j.estado == E.HANDOFF_ENVIADO),
            "pendencias_bloqueantes": sum(orquestrador.pendencias_bloqueantes_abertas(db, j.id) for j in ativas),
        },
        "funil": etapas,
        "projetos": [
            {"id": j.id, "cliente": j.cliente_nome, "titulo": j.titulo,
             "gerente": nomes.get(j.gerente_id), "estado": j.estado.value,
             "etapa": jornadas.ETAPAS[jornadas.indice_etapa(j.estado)][0]}
            for j in ativas
        ],
    }


def permissoes_por_perfil() -> dict:
    """Matriz exibida na tela da Diretoria (Analista, Gerente, Diretoria)."""
    from app.models.enums import Papel
    perfis = [Papel.COMERCIAL, Papel.GERENTE, Papel.ADMIN]
    linhas = [
        ("Cadastrar reunião", Acao.CADASTRAR_REUNIAO), ("Validar ficha (G2)", Acao.VALIDAR_G2),
        ("Aceitar handoff (G3)", Acao.ACEITAR_G3), ("Aprovar briefing (G4)", Acao.APROVAR_G4),
        ("Ver todos os leads", Acao.VER_TODOS_LEADS), ("Gerenciar usuários", Acao.GERENCIAR_USUARIOS),
    ]
    return {
        "perfis": [{"papel": p.value, "perfil": permissoes.ROTULO_PAPEL[p]} for p in perfis],
        "linhas": [{"acao": rotulo, "permitido": {p.value: a in permissoes.MATRIZ[p] for p in perfis}}
                   for rotulo, a in linhas],
        "aviso": "Perfil Diretoria não aprova nada por outra pessoa.",
    }


def auditoria_global(db: Session, usuario: Usuario, *, jornada_id: int | None = None,
                     usuario_id: int | None = None, acao: str | None = None, limite: int = 100) -> list[dict]:
    permissoes.exigir(usuario, Acao.VER_AUDITORIA)
    q = select(Auditoria).order_by(Auditoria.id.desc()).limit(min(limite, 500))
    if jornada_id:
        q = q.where(Auditoria.jornada_id == jornada_id)
    if usuario_id:
        q = q.where(Auditoria.usuario_id == usuario_id)
    if acao:
        q = q.where(Auditoria.acao == acao)
    return [serializar_auditoria(db, a) for a in db.scalars(q)]


def serializar_auditoria(db: Session, a: Auditoria) -> dict:
    autor = db.get(Usuario, a.usuario_id) if a.usuario_id else None
    return {"id": a.id, "quando": a.criado_em.isoformat(), "autor": autor.nome if autor else "Sistema",
            "acao": a.acao, "entidade": a.entidade, "entidade_id": a.entidade_id,
            "jornada_id": a.jornada_id, "antes": a.antes, "depois": a.depois}
