"""Matriz papel × ação, aplicada no backend (a interface só espelha).

Papéis no código x nomes nas telas: comercial = Analista de negócios, admin = Diretoria.
A Diretoria vê tudo e gerencia usuários, mas não aprova nada por outra pessoa.
"""

import enum

from app.models import Usuario
from app.models.enums import Papel
from app.services.erros import SemPermissao


class Acao(str, enum.Enum):
    CADASTRAR_REUNIAO = "cadastrar_reuniao"
    REVISAR_ITENS = "revisar_itens"  # confirmar/editar/rejeitar/adicionar + pendências
    VALIDAR_G2 = "validar_g2"
    EDITAR_DOCUMENTO_COMERCIAL = "editar_documento_comercial"
    ENVIAR_HANDOFF = "enviar_handoff"
    ACEITAR_G3 = "aceitar_g3"
    APROVAR_G4 = "aprovar_g4"
    GERAR_DOCUMENTO_PROJETO = "gerar_documento_projeto"
    VER_TODOS_LEADS = "ver_todos_leads"
    GERENCIAR_USUARIOS = "gerenciar_usuarios"
    VER_AUDITORIA = "ver_auditoria"
    VER_PAINEL = "ver_painel"


MATRIZ: dict[Papel, set[Acao]] = {
    Papel.COMERCIAL: {
        Acao.CADASTRAR_REUNIAO,
        Acao.REVISAR_ITENS,
        Acao.VALIDAR_G2,
        Acao.EDITAR_DOCUMENTO_COMERCIAL,
        Acao.ENVIAR_HANDOFF,
    },
    Papel.GERENTE: {
        Acao.CADASTRAR_REUNIAO,
        Acao.ACEITAR_G3,
        Acao.APROVAR_G4,
        Acao.GERAR_DOCUMENTO_PROJETO,
        Acao.VER_TODOS_LEADS,
        Acao.VER_PAINEL,
    },
    Papel.TECNICO: {Acao.VER_TODOS_LEADS},  # somente leitura
    Papel.ADMIN: {
        Acao.VER_TODOS_LEADS,
        Acao.GERENCIAR_USUARIOS,
        Acao.VER_AUDITORIA,
        Acao.VER_PAINEL,
    },
}

ROTULO_PAPEL = {
    Papel.COMERCIAL: "Analista de negócios",
    Papel.GERENTE: "Gerente de projetos",
    Papel.TECNICO: "Equipe técnica",
    Papel.ADMIN: "Diretoria",
}


def pode(usuario: Usuario, acao: Acao) -> bool:
    return acao in MATRIZ.get(usuario.papel, set())


def exigir(usuario: Usuario, acao: Acao) -> None:
    if not pode(usuario, acao):
        raise SemPermissao()
