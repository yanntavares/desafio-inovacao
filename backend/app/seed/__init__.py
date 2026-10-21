"""Dados fictícios de demonstração: usuários e leads em cada etapa do kanban.

Passa pelos mesmos services da API (extração, gates, pacote), então o que aparece na
demonstração é o que o sistema realmente produz. `python -m app.seed` recarrega do zero.
"""

from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import (
    Aprovacao,
    Auditoria,
    Documento,
    Item,
    Job,
    Jornada,
    PacoteHandoff,
    Pendencia,
    Reuniao,
    Usuario,
)
from app.models.enums import (
    EstadoJornada as E,
)
from app.models.enums import (
    NaturezaItem,
    Papel,
    StatusJob,
    StatusValidacao,
    TipoDocumento,
)
from app.services import documentos, extracao, itens, jornadas, orquestrador, pacote, pendencias, seguranca

SENHA_DEMO = "demonstracao1"
DOMINIO = "seedabit.org.br"

TRANSCRICAO = """Helena: O problema é que os alunos não conseguem rever as aulas gravadas fora do horário.
Rafaela: Entendi. Queremos uma plataforma de cursos online com login de aluno e acompanhamento de progresso.
Helena: Também precisamos de uma área do professor para subir vídeos. Talvez cobrança por assinatura mensal, ainda não decidimos.
Rafaela: Quem aprova o escopo do lado de vocês?
Helena: A diretora Marta decide e aprova tudo. Meu e-mail é helena@exemplo.com.br e o telefone (11) 91234-5678.
Helena: O objetivo é aumentar a retenção dos alunos. Há risco de atraso se o conteúdo não chegar a tempo."""

USUARIOS = [
    ("Marina Costa", "marina.costa", Papel.COMERCIAL),
    ("Lucas Prado", "lucas.prado", Papel.COMERCIAL),
    ("Rafael Lima", "rafael.lima", Papel.GERENTE),
    ("Camila Reis", "camila.reis", Papel.GERENTE),
    ("Diretoria", "diretoria", Papel.ADMIN),
]

# (cliente, negócio, analista, gerente, estado final)
LEADS = [
    ("Studio Nômade", "Site institucional", "marina.costa", None, E.CRIADA),
    ("ONG Maré Viva", "Painel de doações", "marina.costa", None, E.CRIADA),
    ("Escola Aurora", "Portal do aluno", "lucas.prado", None, E.CRIADA),
    ("Instituto Horizonte", "Plataforma de cursos online", "marina.costa", "rafael.lima", E.EM_VALIDACAO),
    ("Café Bonanza", "Cardápio digital", "lucas.prado", None, E.EM_VALIDACAO),
    ("Mercado Pátio", "App de fidelidade", "marina.costa", None, E.VALIDADA),
    ("Clínica Vitalis", "Sistema de agendamento", "marina.costa", "rafael.lima", E.HANDOFF_ENVIADO),
    ("Rede Folha", "Loja virtual", "lucas.prado", "camila.reis", E.ACEITO),
    ("Padaria Trigal", "Pedidos online", "lucas.prado", "camila.reis", E.BRIEFING_APROVADO),
]


def limpar(db: Session) -> None:
    for modelo in (Auditoria, Aprovacao, Documento, PacoteHandoff, Pendencia, Item, Job, Reuniao, Jornada, Usuario):
        db.execute(delete(modelo))
    db.flush()


def _criar_usuarios(db: Session) -> dict[str, Usuario]:
    por_chave = {}
    for nome, chave, papel in USUARIOS:
        u = Usuario(nome=nome, email=f"{chave}@{DOMINIO}", papel=papel, senha_hash=seguranca.hash_senha(SENHA_DEMO))
        db.add(u)
        por_chave[chave] = u
    db.add(Usuario(nome="Nova pessoa", email=f"nova.pessoa@{DOMINIO}", papel=Papel.COMERCIAL))  # convidada
    db.flush()
    return por_chave


def _extrair(db: Session, jornada: Jornada, reuniao: Reuniao, analista: Usuario) -> None:
    job = extracao.enfileirar(db, jornada, reuniao, analista)
    job.status = StatusJob.EXECUTANDO
    extracao.executar(db, job)


def _validar_tudo(db: Session, jornada: Jornada, analista: Usuario) -> None:
    for it in itens.listar(db, jornada.id):
        if it.status_validacao == StatusValidacao.PENDENTE:
            itens.revisar(db, it, jornada, analista, "confirmar",
                          natureza_final=it.natureza_proposta or NaturezaItem.EM_DISCUSSAO)
    for p in list(db.scalars(select(Pendencia).where(Pendencia.jornada_id == jornada.id))):
        if p.status.value == "aberta":
            pendencias.resolver(db, p, analista, "aceitar_com_risco",
                                justificativa="Cliente define após a proposta; risco acompanhado pelo gerente.")
    orquestrador.aprovar_g2(db, jornada, analista)


def _criar_lead(db: Session, u: dict[str, Usuario], cliente, negocio, analista_k, gerente_k, alvo: E) -> None:
    analista = u[analista_k]
    gerente = u.get(gerente_k) if gerente_k else None
    if alvo == E.CRIADA:
        j = Jornada(cliente_nome=cliente, titulo=negocio, responsavel_id=analista.id)
        db.add(j)
        db.flush()
        return
    j, r = jornadas.cadastrar_reuniao(
        db, analista, jornada_id=None, cliente_nome=cliente, titulo_negocio=negocio, analista_id=analista.id,
        data_reuniao=date(2026, 10, 8), tipo="exploratoria",
        participantes=[{"nome": analista.nome, "cliente": False}, {"nome": "Helena", "cliente": True}],
        texto=TRANSCRICAO, formato="colado",
    )
    _extrair(db, j, r, analista)
    if alvo == E.EM_VALIDACAO:
        return
    _validar_tudo(db, j, analista)
    if alvo == E.VALIDADA:
        return
    pacote.enviar(db, j, analista, gerente.id)
    if alvo == E.HANDOFF_ENVIADO:
        return
    pacote.aceitar(db, j, gerente, pacote.ultimo(db, j.id).versao)
    if alvo == E.ACEITO:
        return
    doc = documentos.gerar(db, j, gerente, TipoDocumento.BRIEFING_PROJETO)
    documentos.aprovar(db, doc, gerente)


def recarregar(db: Session) -> None:
    limpar(db)
    usuarios_ = _criar_usuarios(db)
    for lead in LEADS:
        _criar_lead(db, usuarios_, *lead)
    db.commit()


if __name__ == "__main__":
    from app.core.database import SessionLocal

    with SessionLocal() as sessao:
        recarregar(sessao)
    print(f"Demonstração carregada. Senha de todos os usuários: {SENHA_DEMO}")
