"""Enums compartilhados entre banco e código (estados, papéis, natureza etc.)."""

import enum


class Papel(str, enum.Enum):
    COMERCIAL = "comercial"
    GERENTE = "gerente"
    TECNICO = "tecnico"
    ADMIN = "admin"


class EstadoJornada(str, enum.Enum):
    CRIADA = "CRIADA"
    TRANSCRICAO_RECEBIDA = "TRANSCRICAO_RECEBIDA"
    EXTRAINDO = "EXTRAINDO"
    FALHA_EXTRACAO = "FALHA_EXTRACAO"
    EM_VALIDACAO = "EM_VALIDACAO"
    VALIDADA = "VALIDADA"
    HANDOFF_ENVIADO = "HANDOFF_ENVIADO"
    ACEITO = "ACEITO"
    BRIEFING_APROVADO = "BRIEFING_APROVADO"
    CONCLUIDA = "CONCLUIDA"


class Gate(str, enum.Enum):
    G1 = "G1"  # EXTRAINDO -> EM_VALIDACAO (sistema)
    G2 = "G2"  # EM_VALIDACAO -> VALIDADA (comercial)
    G3 = "G3"  # HANDOFF_ENVIADO -> ACEITO (gerente)
    G4 = "G4"  # ACEITO -> BRIEFING_APROVADO (gerente)


class CategoriaItem(str, enum.Enum):
    """As 16 seções do pacote de handoff: uma categoria de item por seção."""

    PROBLEMA = "problema"
    OBJETIVO = "objetivo"
    PUBLICO = "publico"
    ESCOPO = "escopo"
    ENTREGAVEL = "entregavel"
    REQUISITO_NAO_FUNCIONAL = "requisito_nao_funcional"
    INTEGRACAO = "integracao"
    RESTRICAO = "restricao"
    PREMISSA = "premissa"
    RISCO = "risco"
    ORCAMENTO = "orcamento"
    PRAZO = "prazo"
    MARCO = "marco"
    STAKEHOLDER = "stakeholder"
    CRITERIO_ACEITE = "criterio_aceite"
    DUVIDA = "duvida"


class NaturezaItem(str, enum.Enum):
    ACORDADO = "acordado"
    EM_DISCUSSAO = "em_discussao"
    SUGESTAO_IA = "sugestao_ia"


class OrigemItem(str, enum.Enum):
    EXPLICITA = "explicita"
    INFERIDA = "inferida"
    MANUAL = "manual"


class SituacaoItem(str, enum.Enum):
    INFORMADO = "informado"
    NAO_INFORMADO = "nao_informado"


class StatusValidacao(str, enum.Enum):
    PENDENTE = "pendente"
    CONFIRMADO = "confirmado"
    EDITADO = "editado"
    REJEITADO = "rejeitado"


class SeveridadePendencia(str, enum.Enum):
    BLOQUEANTE = "bloqueante"
    ATENCAO = "atencao"


class StatusPendencia(str, enum.Enum):
    ABERTA = "aberta"
    RESOLVIDA = "resolvida"
    ESCLARECIDA = "esclarecida"
    ACEITA_COM_RISCO = "aceita_com_risco"


class TipoDocumento(str, enum.Enum):
    RESUMO_COMERCIAL = "resumo_comercial"
    BRIEFING_COMERCIAL = "briefing_comercial"
    RESUMO_GERENCIAL = "resumo_gerencial"
    BRIEFING_PROJETO = "briefing_projeto"
    PAUTA_KICKOFF = "pauta_kickoff"


class StatusDocumento(str, enum.Enum):
    RASCUNHO = "rascunho"
    APROVADO = "aprovado"


class StatusJob(str, enum.Enum):
    PENDENTE = "pendente"
    EXECUTANDO = "executando"
    CONCLUIDO = "concluido"
    FALHOU = "falhou"


class DecisaoAprovacao(str, enum.Enum):
    APROVADO = "aprovado"
    ACEITO = "aceito"
    DEVOLVIDO = "devolvido"


class ResultadoIA(str, enum.Enum):
    OK = "ok"
    SCHEMA_INVALIDO = "schema_invalido"
    ERRO = "erro"
