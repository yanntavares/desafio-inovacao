// Contratos da API de autenticação (backend/app/api/auth.py e services/usuarios.py).

export type Papel = "comercial" | "gerente" | "tecnico" | "admin";

export type StatusUsuario = "ativo" | "convidado" | "inativo" | "bloqueado";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  perfil: string;
  status: StatusUsuario | string;
}

export interface PerfilDemo extends Usuario {
  descricao: string;
}

export interface RespostaSessao {
  token: string;
  usuario: Usuario;
}

/** Sessão guardada no navegador; `demo` libera a troca rápida de papel. */
export interface Sessao extends RespostaSessao {
  demo: boolean;
}

export interface CadastroEntrada {
  nome: string;
  email: string;
  senha: string;
  confirmar_senha: string;
  aceite_lgpd: boolean;
}

export interface LoginEntrada {
  email: string;
  senha: string;
}

// Contratos do cadastro de reunião (backend/app/api/jornadas.py, services/matriz.py).

export type TipoReuniao = "exploratoria" | "aprofundamento" | "alinhamento" | "fechamento";

export interface LeadOpcao {
  id: number;
  cliente: string;
  titulo: string;
  responsavel_id: number;
  /** false depois do handoff: o lead não recebe novas reuniões. */
  aceita_reuniao: boolean;
}

export interface OpcoesReuniao {
  tipos: TipoReuniao[];
  leads: LeadOpcao[];
}

export interface UsuarioOpcao {
  id: number;
  nome: string;
  papel: Papel;
}

export interface Participante {
  nome: string;
  cliente: boolean;
}

export interface PreVisualizacao {
  formato: string;
  palavras: number;
  segmentos: number;
  dados_mascarados: number;
  limite_palavras: number;
}

export interface ReuniaoCadastrada {
  jornada_id: number;
  reuniao_id: number;
  estado: string;
  palavras: number;
  segmentos: number;
  dados_mascarados: number;
  formato: string;
}

// Contratos do kanban (backend/app/services/jornadas.py: kanban e _card).

export type EtapaKanban =
  | "Nova reunião"
  | "Em validação"
  | "Validada"
  | "Handoff enviado"
  | "Aceito"
  | "Briefing aprovado"
  | "Concluída";

export interface CardLead {
  id: number;
  cliente: string;
  titulo: string;
  estado: string;
  analista: { id: number; nome: string; iniciais: string };
  reunioes: number;
  bloqueantes: number;
  /** Percentual de seções preenchidas (0–100). */
  completude: number;
  extraindo: boolean;
  falha_extracao: boolean;
}

export interface ColunaKanban {
  etapa: EtapaKanban;
  total: number;
  cards: CardLead[];
}

export interface RespostaKanban {
  colunas: ColunaKanban[];
  visiveis: number;
  total: number;
  /** Texto do banner de escopo, já ajustado ao papel pela API. */
  aviso: string;
}

export interface FiltrosKanban {
  analista_id: number | null;
  negocio_id: number | null;
  so_bloqueantes: boolean;
}

// Contratos da página do lead (backend/app/api/jornadas.py: detalhe, visao-geral, auditoria, handoff).

export type EstadoJornada =
  | "CRIADA"
  | "TRANSCRICAO_RECEBIDA"
  | "EXTRAINDO"
  | "FALHA_EXTRACAO"
  | "EM_VALIDACAO"
  | "VALIDADA"
  | "HANDOFF_ENVIADO"
  | "ACEITO"
  | "BRIEFING_APROVADO"
  | "CONCLUIDA";

/** Gate liberado para quem está logado ou o motivo escrito do bloqueio. */
export interface SituacaoGate {
  liberado: boolean;
  motivo: string | null;
}

export interface ResumoPacote {
  acordados: number;
  em_discussao: number;
  bloqueantes: number;
  secoes_preenchidas: number;
  secoes_total: number;
  faltam: string[];
}

export interface PacoteHandoff {
  id: number;
  jornada_id: number;
  versao: number;
  hash: string;
  indice_completude: number;
  gerente_id: number | null;
  enviado_em: string | null;
  resumo: ResumoPacote;
}

export interface DetalheJornada {
  id: number;
  cliente: string;
  titulo: string;
  estado: EstadoJornada;
  lead_desde: string;
  etapas: { etapa: EtapaKanban; situacao: "feita" | "atual" | "futura" }[];
  gerente: { id: number; nome: string } | null;
  analista: { id: number; nome: string; iniciais: string };
  reunioes: { total: number; ultima: string | null };
  completude: { preenchidas: number; total: number; percentual: number };
  pendencias_abertas: { id: number; campo: string; descricao: string; severidade: string }[];
  bloqueantes: number;
  gates: Record<"G2" | "G3" | "G4", SituacaoGate>;
  devolucao: { comentario: string; quando: string } | null;
  handoff: PacoteHandoff | null;
}

export type NaturezaItem = "acordado" | "em_discussao" | "sugestao_ia";
export type OrigemItem = "explicita" | "inferida" | "manual";

export interface ItemSecao {
  id: number;
  descricao: string;
  origem: OrigemItem;
}

/** Uma das 16 seções do pacote; itens ainda não decididos por pessoa ficam em `sugestao_ia`. */
export interface SecaoVisaoGeral {
  titulo: string;
  acordado: ItemSecao[];
  em_discussao: ItemSecao[];
  sugestao_ia: ItemSecao[];
  preenchida: boolean;
}

export interface VisaoGeral {
  secoes: Record<string, SecaoVisaoGeral>;
  nao_informados: string[];
}

export interface Evidencia {
  item_id: number;
  origem: OrigemItem;
  evidencias: {
    segmento_ordem: number;
    trecho?: string;
    /** Posição do trecho dentro de `texto_mascarado` (só o texto mascarado tem offsets válidos). */
    inicio?: number;
    fim?: number;
    reuniao_id?: number;
    falante: string;
    texto: string;
    texto_mascarado?: string;
  }[];
  aviso: string | null;
}

export type CategoriaItem =
  | "problema"
  | "objetivo"
  | "publico"
  | "escopo"
  | "entregavel"
  | "requisito_nao_funcional"
  | "integracao"
  | "restricao"
  | "premissa"
  | "risco"
  | "orcamento"
  | "prazo"
  | "marco"
  | "stakeholder"
  | "criterio_aceite"
  | "duvida";

export interface NovoItemEntrada {
  categoria: CategoriaItem;
  descricao: string;
  natureza_final: NaturezaItem;
}

export interface SegmentoReuniao {
  ordem: number;
  falante: string;
  /** Texto original: só a interface o vê; a IA só recebe o mascarado. */
  texto: string;
  texto_mascarado: string;
}

export interface ReuniaoCompleta {
  id: number;
  jornada_id: number;
  titulo: string;
  dados_mascarados: number;
  segmentos: SegmentoReuniao[];
}

export interface RegistroAuditoria {
  id: number;
  quando: string;
  autor: string;
  acao: string;
  entidade: string;
  entidade_id: number | null;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
}

export interface ReuniaoResumo {
  id: number;
  titulo: string;
  tipo: TipoReuniao;
  data_reuniao: string | null;
  participantes: Participante[];
  palavras: number;
  segmentos: number;
  dados_mascarados: number;
}

export interface DocumentoResumo {
  id: number;
  tipo: string;
  versao: number;
  status: "rascunho" | "aprovado";
  criado_em: string;
}

export type TipoDocumento =
  | "resumo_comercial"
  | "briefing_comercial"
  | "resumo_gerencial"
  | "briefing_projeto"
  | "pauta_kickoff";

/** `paragrafo` é o índice da linha do markdown (a partir de 0) que cita os itens. */
export interface DocumentoCompleto extends DocumentoResumo {
  jornada_id: number;
  conteudo_md: string;
  itens: { paragrafo: number; item_ids: number[] }[];
}

export interface HistoricoDocumentacao {
  documentos: DocumentoResumo[];
  pacotes: PacoteHandoff[];
  /** Tipos que só são gerados depois do aceite (briefing e pauta). */
  apos_o_aceite: string[];
}

// --- Diretoria (tela 03) ---------------------------------------------------------

export interface FiltrosPainel {
  /** 0 = todo o período (a API só filtra por data quando dias > 0). */
  dias: number;
  analista_id: number | null;
  gerente_id: number | null;
}

export interface ProjetoPainel {
  id: number;
  cliente: string;
  titulo: string;
  gerente: string | null;
  estado: EstadoJornada;
  etapa: string;
}

export interface PainelFunil {
  kpis: {
    leads_no_funil: number;
    em_validacao: number;
    handoffs_aguardando_aceite: number;
    pendencias_bloqueantes: number;
  };
  funil: { etapa: string; total: number }[];
  ia: { chamadas: number; tokens_entrada: number; tokens_saida: number; custo_estimado: number };
  projetos: ProjetoPainel[];
}

export interface MatrizPermissoes {
  perfis: { papel: Papel; perfil: string }[];
  linhas: { acao: string; permitido: Partial<Record<Papel, boolean>> }[];
  aviso: string;
}

export interface ConviteEntrada {
  nome: string;
  email: string;
  papel: Papel;
}

export interface UsuarioPatch {
  papel?: Papel;
  ativo?: boolean;
}

export interface LeadEncontrado {
  id: number;
  cliente: string;
  titulo: string;
}

export interface Notificacao {
  id: number;
  quando: string;
  texto: string;
  jornada_id: number | null;
  lida: boolean;
}

// Revisão da ficha (G2): itens e pendências (backend/app/api/jornadas.py).

export type StatusValidacao = "pendente" | "confirmado" | "editado" | "rejeitado";

export interface ItemRevisao {
  id: number;
  categoria: string;
  descricao: string;
  natureza_proposta: NaturezaItem | null;
  natureza_final: NaturezaItem | null;
  origem: OrigemItem;
  situacao: "informado" | "nao_informado";
  status_validacao: StatusValidacao;
  sem_evidencia: boolean;
}

/** `confirmar` e `editar` exigem a natureza escolhida por pessoa; a IA nunca decide. */
export interface RevisaoItemEntrada {
  acao: "confirmar" | "editar" | "rejeitar";
  natureza_final?: NaturezaItem;
  descricao?: string;
}

export type StatusPendencia = "aberta" | "resolvida" | "esclarecida" | "aceita_com_risco";

export interface Pendencia {
  id: number;
  jornada_id: number;
  /** Categoria do item que falta (ou rótulo livre, nas lacunas apontadas pela IA). */
  campo: string;
  descricao: string;
  severidade: "bloqueante" | "atencao";
  status: StatusPendencia;
  justificativa: string | null;
  origem_ia: boolean;
  pergunta_sugerida: string | null;
}

export interface ResolucaoPendencia {
  acao: "informar" | "esclarecido" | "aceitar_com_risco";
  justificativa?: string;
  descricao?: string;
}
