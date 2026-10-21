"""Único lugar que altera `Jornada.estado`. Gates G2/G3/G4 são checados aqui, por papel e estado.

Cada transição grava auditoria na mesma transação (o commit é do chamador).
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Jornada, Pendencia, Usuario
from app.models.enums import EstadoJornada as E
from app.models.enums import Gate, Papel, SeveridadePendencia, StatusPendencia
from app.services import auditoria
from app.services.erros import ErroNegocio, SemPermissao

TRANSICOES: dict[E, set[E]] = {
    E.CRIADA: {E.TRANSCRICAO_RECEBIDA},
    E.TRANSCRICAO_RECEBIDA: {E.EXTRAINDO},
    E.EXTRAINDO: {E.EM_VALIDACAO, E.FALHA_EXTRACAO},
    E.FALHA_EXTRACAO: {E.EXTRAINDO, E.TRANSCRICAO_RECEBIDA},
    # nova reunião reabre a validação (dossiê vivo)
    E.EM_VALIDACAO: {E.VALIDADA, E.TRANSCRICAO_RECEBIDA},
    E.VALIDADA: {E.HANDOFF_ENVIADO, E.TRANSCRICAO_RECEBIDA},
    E.HANDOFF_ENVIADO: {E.ACEITO, E.EM_VALIDACAO},  # devolução volta a EM_VALIDACAO
    E.ACEITO: {E.BRIEFING_APROVADO},
    E.BRIEFING_APROVADO: {E.CONCLUIDA},
    E.CONCLUIDA: set(),
}

ESTADOS_ACEITAM_REUNIAO = {E.CRIADA, E.EM_VALIDACAO, E.VALIDADA, E.FALHA_EXTRACAO}


def transitar(
    db: Session, jornada: Jornada, destino: E, usuario: Usuario | None, motivo: str = ""
) -> None:
    if destino not in TRANSICOES[jornada.estado]:
        raise ErroNegocio(
            f"A jornada está em {jornada.estado.value} e não pode ir para {destino.value}.",
            409,
            "transicao_invalida",
        )
    antes = jornada.estado
    jornada.estado = destino
    auditoria.registrar(
        db, usuario, "mudar_estado", "jornada", jornada.id, jornada.id,
        {"estado": antes.value}, {"estado": destino.value, "motivo": motivo},
    )


def pendencias_bloqueantes_abertas(db: Session, jornada_id: int) -> int:
    return db.scalar(
        select(func.count(Pendencia.id)).where(
            Pendencia.jornada_id == jornada_id,
            Pendencia.severidade == SeveridadePendencia.BLOQUEANTE,
            Pendencia.status == StatusPendencia.ABERTA,
        )
    ) or 0


def motivo_bloqueio(
    db: Session, gate: Gate, jornada: Jornada, usuario: Usuario
) -> tuple[str, int] | None:
    """None = liberado para este usuário agora; senão (motivo escrito, status HTTP).

    A interface mostra o motivo ao lado do botão desabilitado; a API recusa igual.
    """
    if gate == Gate.G2:
        if usuario.papel != Papel.COMERCIAL or usuario.id != jornada.responsavel_id:
            return "Só o analista responsável por este lead valida a ficha.", 403
        if jornada.estado != E.EM_VALIDACAO:
            return "A validação só pode ser aprovada com a jornada em validação.", 409
        n = pendencias_bloqueantes_abertas(db, jornada.id)
        if n:
            plural = "s" if n > 1 else ""
            return f"{n} pendência{plural} bloqueante{plural} aberta{plural}.", 409
        return None
    if gate in (Gate.G3, Gate.G4):
        if usuario.papel != Papel.GERENTE or usuario.id != jornada.gerente_id:
            return "Só o gerente designado para este lead decide neste ponto.", 403
        if usuario.id == jornada.responsavel_id:  # defesa: quem valida não aceita
            return "Quem validou não pode aceitar o próprio handoff.", 403
        esperado = E.HANDOFF_ENVIADO if gate == Gate.G3 else E.ACEITO
        if jornada.estado != esperado:
            return f"Este gate só abre com a jornada em {esperado.value}.", 409
        return None
    return "Este gate é decidido pelo sistema.", 403


def exigir_gate(db: Session, gate: Gate, jornada: Jornada, usuario: Usuario) -> None:
    if bloqueio := motivo_bloqueio(db, gate, jornada, usuario):
        mensagem, status = bloqueio
        if status == 403:
            raise SemPermissao(mensagem)
        raise ErroNegocio(mensagem, status, "gate_bloqueado")


def aprovar_g2(db: Session, jornada: Jornada, usuario: Usuario) -> None:
    exigir_gate(db, Gate.G2, jornada, usuario)
    transitar(db, jornada, E.VALIDADA, usuario, "G2 aprovado")
