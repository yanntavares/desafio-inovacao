"""Jornada = lead + negócio. Cadastro de reunião, kanban, visibilidade e detalhe do lead."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Item, Job, Jornada, Pendencia, Reuniao, Usuario
from app.models.enums import (
    EstadoJornada as E,
)
from app.models.enums import (
    Gate,
    Papel,
    SeveridadePendencia,
    SituacaoItem,
    StatusPendencia,
    StatusValidacao,
)
from app.services import auditoria, extracao, orquestrador, permissoes, transcricao
from app.services.erros import ErroNegocio, NaoEncontrado, SemPermissao
from app.services.matriz import SECOES, TIPOS_REUNIAO
from app.services.permissoes import Acao

# Colunas do kanban = etapas do funil; concluídas ficam no histórico.
ETAPAS: list[tuple[str, set[E]]] = [
    ("Nova reunião", {E.CRIADA, E.TRANSCRICAO_RECEBIDA, E.EXTRAINDO, E.FALHA_EXTRACAO}),
    ("Em validação", {E.EM_VALIDACAO}),
    ("Validada", {E.VALIDADA}),
    ("Handoff enviado", {E.HANDOFF_ENVIADO}),
    ("Aceito", {E.ACEITO}),
    ("Briefing aprovado", {E.BRIEFING_APROVADO}),
    ("Concluída", {E.CONCLUIDA}),
]


def indice_etapa(estado: E) -> int:
    return next(i for i, (_, estados) in enumerate(ETAPAS) if estado in estados)


def iniciais(nome: str) -> str:
    partes = nome.split()
    return (partes[0][0] + (partes[-1][0] if len(partes) > 1 else "")).upper()


# --- visibilidade -----------------------------------------------------------------

def pode_ver(usuario: Usuario, jornada: Jornada) -> bool:
    return permissoes.pode(usuario, Acao.VER_TODOS_LEADS) or jornada.responsavel_id == usuario.id


def obter_visivel(db: Session, usuario: Usuario, jornada_id: int) -> Jornada:
    jornada = db.get(Jornada, jornada_id)
    if not jornada:
        raise NaoEncontrado("Lead")
    if not pode_ver(usuario, jornada):
        raise SemPermissao("Você só vê os seus leads.")
    return jornada


def _consulta_visivel(usuario: Usuario):
    q = select(Jornada)
    if not permissoes.pode(usuario, Acao.VER_TODOS_LEADS):
        q = q.where(Jornada.responsavel_id == usuario.id)
    return q


# --- completude e contagens -------------------------------------------------------

def completude(db: Session, jornada_id: int) -> tuple[int, int]:
    """(seções preenchidas, total). Seção preenchida = tem item não rejeitado e informado."""
    cats = set(db.scalars(
        select(Item.categoria).where(
            Item.jornada_id == jornada_id,
            Item.status_validacao != StatusValidacao.REJEITADO,
            Item.situacao == SituacaoItem.INFORMADO,
        )
    ))
    return len(cats), len(SECOES)


def uso_ia(db: Session, jornada_id: int | None = None) -> dict:
    """Chamadas, tokens e custo de IA registrados em `job` (de uma jornada ou de todas)."""
    q = select(func.count(Job.id), func.coalesce(func.sum(Job.tokens_entrada), 0),
               func.coalesce(func.sum(Job.tokens_saida), 0), func.coalesce(func.sum(Job.custo_estimado), 0.0)
               ).where(Job.provedor.is_not(None))
    if jornada_id is not None:
        q = q.where(Job.jornada_id == jornada_id)
    chamadas, entrada, saida, custo = db.execute(q).one()
    return {"chamadas": chamadas, "tokens_entrada": entrada, "tokens_saida": saida,
            "custo_estimado": round(float(custo), 4)}


def contar_bloqueantes(db: Session, jornada_id: int) -> int:
    return orquestrador.pendencias_bloqueantes_abertas(db, jornada_id)


# --- cadastro de reunião ----------------------------------------------------------

def cadastrar_reuniao(
    db: Session, usuario: Usuario, *, jornada_id: int | None, cliente_nome: str | None,
    titulo_negocio: str, analista_id: int, data_reuniao: date, tipo: str,
    participantes: list[dict], texto: str, formato: str,
) -> tuple[Jornada, Reuniao]:
    permissoes.exigir(usuario, Acao.CADASTRAR_REUNIAO)
    if tipo not in TIPOS_REUNIAO:
        raise ErroNegocio(f"Tipo de reunião inválido. Use: {', '.join(TIPOS_REUNIAO)}.")
    if not participantes:
        raise ErroNegocio("Informe ao menos um participante.")
    analista = db.get(Usuario, analista_id)
    if not analista or analista.papel != Papel.COMERCIAL or not analista.ativo:
        raise ErroNegocio("Escolha um analista de negócios ativo como responsável.")
    # analista cadastra só para si; o gerente escolhe o analista responsável
    if usuario.papel == Papel.COMERCIAL and analista.id != usuario.id:
        raise SemPermissao("Você só pode cadastrar reuniões dos seus próprios leads.")
    dados = transcricao.processar(texto, formato)  # valida tamanho/formato antes de gravar

    if jornada_id:
        jornada = obter_visivel(db, usuario, jornada_id)
        if jornada.estado not in orquestrador.ESTADOS_ACEITAM_REUNIAO:
            raise ErroNegocio("Este lead já foi enviado ao gerente; não aceita novas reuniões.", 409)
        if jornada.responsavel_id != analista.id:
            raise ErroNegocio("O analista responsável por este lead é outro. Escolha o analista do lead.")
    else:
        if not cliente_nome or not cliente_nome.strip():
            raise ErroNegocio("Informe o nome do lead.")
        jornada = Jornada(cliente_nome=cliente_nome.strip(), titulo=titulo_negocio.strip(),
                          responsavel_id=analista.id)
        db.add(jornada)
        db.flush()
        auditoria.registrar(db, usuario, "cadastrar_lead", "jornada", jornada.id, jornada.id,
                            None, {"cliente": jornada.cliente_nome, "titulo": jornada.titulo})

    reuniao = Reuniao(jornada_id=jornada.id, titulo=titulo_negocio.strip(), analista_id=analista.id,
                      data_reuniao=data_reuniao, tipo=tipo, participantes=participantes, **dados)
    db.add(reuniao)
    db.flush()
    auditoria.registrar(db, usuario, "cadastrar_reuniao", "reuniao", reuniao.id, jornada.id, None,
                        {"palavras": reuniao.qtd_palavras, "mascarados": len(reuniao.mascaras)})
    orquestrador.transitar(db, jornada, E.TRANSCRICAO_RECEBIDA, usuario, "transcrição recebida")
    extracao.enfileirar(db, jornada, reuniao, usuario)
    return jornada, reuniao


def tentar_extracao_de_novo(db: Session, usuario: Usuario, jornada: Jornada) -> None:
    permissoes.exigir(usuario, Acao.CADASTRAR_REUNIAO)
    if usuario.papel == Papel.COMERCIAL and jornada.responsavel_id != usuario.id:
        raise SemPermissao("Este lead pertence a outro analista.")
    if jornada.estado != E.FALHA_EXTRACAO:
        raise ErroNegocio("Só é possível tentar de novo quando a extração falhou.", 409)
    reuniao = jornada.reunioes[-1]
    extracao.enfileirar(db, jornada, reuniao, usuario)


# --- kanban -----------------------------------------------------------------------

def _card(db: Session, j: Jornada, analista: Usuario) -> dict:
    preenchidas, total = completude(db, j.id)
    return {
        "id": j.id,
        "cliente": j.cliente_nome,
        "titulo": j.titulo,
        "estado": j.estado.value,
        "analista": {"id": analista.id, "nome": analista.nome, "iniciais": iniciais(analista.nome)},
        "reunioes": len(j.reunioes),
        "bloqueantes": contar_bloqueantes(db, j.id),
        "completude": round(100 * preenchidas / total),
        "extraindo": j.estado == E.EXTRAINDO,
        "falha_extracao": j.estado == E.FALHA_EXTRACAO,
    }


def kanban(
    db: Session, usuario: Usuario, *, analista_id: int | None = None, negocio_id: int | None = None,
    so_bloqueantes: bool = False, q: str | None = None, concluidas: bool = False,
) -> dict:
    total = db.scalar(select(func.count(Jornada.id))) or 0
    consulta = _consulta_visivel(usuario)
    if analista_id:
        consulta = consulta.where(Jornada.responsavel_id == analista_id)
    if negocio_id:
        consulta = consulta.where(Jornada.id == negocio_id)
    if q:
        like = f"%{q.strip()}%"
        consulta = consulta.where(Jornada.cliente_nome.ilike(like) | Jornada.titulo.ilike(like))
    jornadas = list(db.scalars(consulta.order_by(Jornada.atualizado_em.desc())))
    analistas = {u.id: u for u in db.scalars(select(Usuario))}
    cards = [_card(db, j, analistas[j.responsavel_id]) for j in jornadas]
    if so_bloqueantes:
        cards = [c for c in cards if c["bloqueantes"]]
    colunas = []
    for nome, estados in ETAPAS:
        if (nome == "Concluída") != concluidas:
            continue
        itens = [c for c in cards if E(c["estado"]) in estados]
        colunas.append({"etapa": nome, "total": len(itens), "cards": itens})
    visiveis = len(jornadas)
    return {"colunas": colunas, "visiveis": visiveis, "total": total,
            "aviso": (f"Você vê todos os leads ({total}). Analistas veem apenas os seus."
                      if permissoes.pode(usuario, Acao.VER_TODOS_LEADS)
                      else f"Você vê apenas os seus leads ({visiveis} de {total}). "
                           "Os demais pertencem a outros analistas.")}


# --- detalhe do lead --------------------------------------------------------------

def gates_do_usuario(db: Session, jornada: Jornada, usuario: Usuario) -> dict:
    """Para cada gate: liberado ou o motivo escrito (botão desabilitado com motivo)."""
    out = {}
    for gate in (Gate.G2, Gate.G3, Gate.G4):
        motivo = orquestrador.motivo_bloqueio(db, gate, jornada, usuario)
        out[gate.value] = {"liberado": motivo is None, "motivo": motivo[0] if motivo else None}
    return out


def detalhe(db: Session, jornada: Jornada, usuario: Usuario) -> dict:
    analista = db.get(Usuario, jornada.responsavel_id)
    gerente = db.get(Usuario, jornada.gerente_id) if jornada.gerente_id else None
    atual = indice_etapa(jornada.estado)
    etapas = [
        {"etapa": nome, "situacao": "feita" if i < atual else "atual" if i == atual else "futura"}
        for i, (nome, _) in enumerate(ETAPAS)
    ]
    preenchidas, total = completude(db, jornada.id)
    ultima = max((r.data_reuniao for r in jornada.reunioes if r.data_reuniao), default=None)
    pendencias_abertas = db.scalars(
        select(Pendencia).where(Pendencia.jornada_id == jornada.id,
                                Pendencia.status == StatusPendencia.ABERTA)
    ).all()
    return {
        "id": jornada.id,
        "cliente": jornada.cliente_nome,
        "titulo": jornada.titulo,
        "estado": jornada.estado.value,
        "lead_desde": jornada.criado_em.date().isoformat(),
        "etapas": etapas,
        "gerente": {"id": gerente.id, "nome": gerente.nome} if gerente else None,
        "analista": {"id": analista.id, "nome": analista.nome, "iniciais": iniciais(analista.nome)},
        "reunioes": {"total": len(jornada.reunioes), "ultima": ultima.isoformat() if ultima else None},
        "completude": {"preenchidas": preenchidas, "total": total,
                       "percentual": round(100 * preenchidas / total)},
        "pendencias_abertas": [
            {"id": p.id, "campo": p.campo, "descricao": p.descricao, "severidade": p.severidade.value}
            for p in pendencias_abertas
        ],
        "bloqueantes": sum(1 for p in pendencias_abertas if p.severidade == SeveridadePendencia.BLOQUEANTE),
        "gates": gates_do_usuario(db, jornada, usuario),
        "ia": uso_ia(db, jornada.id),
    }


# --- apoio às telas: selects, projetos do gerente, busca -----------------------------

def opcoes_reuniao(db: Session, usuario: Usuario) -> dict:
    """Selects do cadastro de reunião e filtro de negócios do kanban."""
    js = db.scalars(_consulta_visivel(usuario).where(Jornada.estado != E.CONCLUIDA)
                    .order_by(Jornada.cliente_nome))
    return {
        "tipos": TIPOS_REUNIAO,
        "leads": [{"id": j.id, "cliente": j.cliente_nome, "titulo": j.titulo,
                   "responsavel_id": j.responsavel_id,
                   "aceita_reuniao": j.estado in orquestrador.ESTADOS_ACEITAM_REUNIAO} for j in js],
    }


def projetos(db: Session, usuario: Usuario) -> list[dict]:
    """Menu "Projetos" do gerente: leads dele já aceitos."""
    permissoes.exigir(usuario, Acao.ACEITAR_G3)
    js = db.scalars(select(Jornada).where(Jornada.gerente_id == usuario.id,
                                          Jornada.estado.in_([E.ACEITO, E.BRIEFING_APROVADO]))
                    .order_by(Jornada.atualizado_em.desc()))
    return [_card(db, j, db.get(Usuario, j.responsavel_id)) for j in js]


def buscar(db: Session, usuario: Usuario, q: str, limite: int = 10) -> dict:
    q = (q or "").strip()
    if len(q) < 2:
        return {"leads": [], "usuarios": []}
    like = f"%{q}%"
    leads = db.scalars(_consulta_visivel(usuario)
                       .where(Jornada.cliente_nome.ilike(like) | Jornada.titulo.ilike(like))
                       .order_by(Jornada.cliente_nome).limit(limite))
    usuarios = []
    if permissoes.pode(usuario, Acao.GERENCIAR_USUARIOS):
        usuarios = db.scalars(select(Usuario).where(Usuario.nome.ilike(like) | Usuario.email.ilike(like))
                              .order_by(Usuario.nome).limit(limite))
    return {
        "leads": [{"id": j.id, "cliente": j.cliente_nome, "titulo": j.titulo, "estado": j.estado.value}
                  for j in leads],
        "usuarios": [{"id": u.id, "nome": u.nome, "email": u.email, "papel": u.papel.value} for u in usuarios],
    }
