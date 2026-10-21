"""Configuração (não prompt) do que é obrigatório e do que compõe o pacote de handoff."""

from app.models.enums import CategoriaItem as C
from app.models.enums import SeveridadePendencia as S

# As 16 seções do pacote, na ordem de exibição: uma por categoria de item.
SECOES: list[C] = list(C)

TITULO_SECAO = {
    C.PROBLEMA: "Problema",
    C.OBJETIVO: "Objetivo",
    C.PUBLICO: "Público e usuários",
    C.ESCOPO: "Escopo",
    C.ENTREGAVEL: "Entregáveis",
    C.REQUISITO_NAO_FUNCIONAL: "Requisitos não funcionais",
    C.INTEGRACAO: "Integrações",
    C.RESTRICAO: "Restrições",
    C.PREMISSA: "Premissas",
    C.RISCO: "Riscos",
    C.ORCAMENTO: "Orçamento",
    C.PRAZO: "Prazos",
    C.MARCO: "Marcos",
    C.STAKEHOLDER: "Stakeholders",
    C.CRITERIO_ACEITE: "Critérios de aceite",
    C.DUVIDA: "Dúvidas para o gerente",
}

# Matriz de campos obrigatórios -> severidade da pendência quando faltar.
# Orçamento e prazo nunca recebem valor da IA: faltando, viram pendência bloqueante.
OBRIGATORIOS: dict[C, S] = {
    C.PROBLEMA: S.BLOQUEANTE,
    C.ESCOPO: S.BLOQUEANTE,
    C.ORCAMENTO: S.BLOQUEANTE,
    C.PRAZO: S.BLOQUEANTE,
    C.STAKEHOLDER: S.ATENCAO,
    C.OBJETIVO: S.ATENCAO,
    C.ENTREGAVEL: S.ATENCAO,
    C.RISCO: S.ATENCAO,
}

# Categorias que a IA jamais preenche com valor próprio.
SEM_VALOR_DA_IA = {C.ORCAMENTO, C.PRAZO}

TIPOS_REUNIAO = ["exploratoria", "aprofundamento", "alinhamento", "fechamento"]
