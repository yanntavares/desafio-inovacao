import type {
  CadastroEntrada,
  ConviteEntrada,
  FiltrosPainel,
  MatrizPermissoes,
  PainelFunil,
  UsuarioPatch,
  DetalheJornada,
  EstadoJornada,
  Evidencia,
  HistoricoDocumentacao,
  PacoteHandoff,
  RegistroAuditoria,
  ReuniaoResumo,
  VisaoGeral,
  FiltrosKanban,
  ItemRevisao,
  LeadEncontrado,
  NovoItemEntrada,
  ReuniaoCompleta,
  RevisaoItemEntrada,
  LoginEntrada,
  Notificacao,
  OpcoesReuniao,
  Papel,
  PerfilDemo,
  PreVisualizacao,
  ReuniaoCadastrada,
  RespostaKanban,
  RespostaSessao,
  Usuario,
  UsuarioOpcao,
} from "./tipos";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
/** Só para orientar o preenchimento; quem recusa e-mail de outro domínio é a API. */
export const DOMINIO_EMAIL = process.env.NEXT_PUBLIC_EMAIL_DOMINIO ?? "seedabit.org.br";

/** Erro de regra devolvido pela API como `{detail, codigo}` (main.py). */
export class ErroApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    readonly codigo?: string,
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

interface Opcoes {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  corpo?: unknown;
  token?: string | null;
}

function mensagemDoDetalhe(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  // Erro de validação do FastAPI (422): lista de {msg, loc}.
  if (Array.isArray(detail) && detail.length > 0) {
    const primeiro = detail[0] as { msg?: unknown };
    if (typeof primeiro.msg === "string") return "Dados inválidos. Revise os campos e tente de novo.";
  }
  return null;
}

export async function requisitar<T>(caminho: string, { metodo = "GET", corpo, token }: Opcoes = {}): Promise<T> {
  // FormData (upload de transcrição) segue como multipart; o navegador define o boundary.
  const multipart = corpo instanceof FormData;
  const cabecalhos: Record<string, string> = { Accept: "application/json" };
  if (corpo !== undefined && !multipart) cabecalhos["Content-Type"] = "application/json";
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : multipart ? corpo : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi("Não foi possível falar com o servidor. Verifique a conexão e tente de novo.", 0);
  }

  const dados: unknown = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const { detail, codigo } = (dados ?? {}) as { detail?: unknown; codigo?: string };
    throw new ErroApi(
      mensagemDoDetalhe(detail) ?? `Erro inesperado (${resposta.status}). Tente de novo.`,
      resposta.status,
      codigo,
    );
  }
  return dados as T;
}

export const apiAuth = {
  cadastrar: (dados: CadastroEntrada) =>
    requisitar<RespostaSessao>("/auth/cadastro", { metodo: "POST", corpo: dados }),
  entrar: (dados: LoginEntrada) => requisitar<RespostaSessao>("/auth/login", { metodo: "POST", corpo: dados }),
  renovar: (token: string) => requisitar<RespostaSessao>("/auth/renovar", { metodo: "POST", token }),
  eu: (token: string) => requisitar<Usuario>("/auth/me", { token }),
  perfisDemo: () => requisitar<PerfilDemo[]>("/auth/demo"),
  entrarDemo: (papel: Papel) => requisitar<RespostaSessao>("/auth/demo", { metodo: "POST", corpo: { papel } }),
};

export const apiReunioes = {
  opcoes: (token: string) => requisitar<OpcoesReuniao>("/reunioes/opcoes", { token }),
  usuarios: (token: string) => requisitar<UsuarioOpcao[]>("/usuarios/opcoes", { token }),
  /** Não grava nada: devolve palavras, segmentos e quantos dados serão mascarados. */
  preVisualizar: (token: string, transcricao: FormData) =>
    requisitar<PreVisualizacao>("/reunioes/pre-visualizar", { metodo: "POST", corpo: transcricao, token }),
  cadastrar: (token: string, dados: FormData) =>
    requisitar<ReuniaoCadastrada>("/reunioes", { metodo: "POST", corpo: dados, token }),
};

export const apiKanban = {
  /** A API já restringe o analista aos próprios leads, com ou sem filtro. */
  listar: (token: string, { analista_id, negocio_id, so_bloqueantes }: FiltrosKanban, concluidas = false) => {
    const params = new URLSearchParams();
    if (analista_id) params.set("analista_id", String(analista_id));
    if (negocio_id) params.set("negocio_id", String(negocio_id));
    if (so_bloqueantes) params.set("so_bloqueantes", "true");
    if (concluidas) params.set("concluidas", "true"); // histórico: só a coluna "Concluída"
    const consulta = params.toString();
    return requisitar<RespostaKanban>(`/kanban${consulta ? `?${consulta}` : ""}`, { token });
  },
};

export const apiJornadas = {
  detalhe: (token: string, id: number) => requisitar<DetalheJornada>(`/jornadas/${id}`, { token }),
  visaoGeral: (token: string, id: number) => requisitar<VisaoGeral>(`/jornadas/${id}/visao-geral`, { token }),
  auditoria: (token: string, id: number) => requisitar<RegistroAuditoria[]>(`/jornadas/${id}/auditoria`, { token }),
  reunioes: (token: string, id: number) => requisitar<ReuniaoResumo[]>(`/jornadas/${id}/reunioes`, { token }),
  documentos: (token: string, id: number) =>
    requisitar<HistoricoDocumentacao>(`/jornadas/${id}/documentos`, { token }),
  evidencia: (token: string, itemId: number) => requisitar<Evidencia>(`/itens/${itemId}/evidencia`, { token }),
  /** A extração falhou: reenfileira sem perder a transcrição nem duplicar itens. */
  tentarExtracaoDeNovo: (token: string, id: number) =>
    requisitar<{ estado: EstadoJornada }>(`/jornadas/${id}/extracao/tentar-novamente`, { metodo: "POST", token }),
  itens: (token: string, id: number) => requisitar<ItemRevisao[]>(`/jornadas/${id}/itens`, { token }),
  /** Só o analista responsável, com a jornada em validação (G2); a API recusa o resto. */
  adicionarItem: (token: string, id: number, dados: NovoItemEntrada) =>
    requisitar<ItemRevisao>(`/jornadas/${id}/itens`, { metodo: "POST", corpo: dados, token }),
  revisarItem: (token: string, itemId: number, dados: RevisaoItemEntrada) =>
    requisitar<ItemRevisao>(`/itens/${itemId}`, { metodo: "PATCH", corpo: dados, token }),
  /** Transcrição completa de uma reunião (a evidência aponta o trecho dentro dela). */
  reuniao: (token: string, reuniaoId: number) => requisitar<ReuniaoCompleta>(`/reunioes/${reuniaoId}`, { token }),
  enviarHandoff: (token: string, id: number, gerente_id: number) =>
    requisitar<PacoteHandoff>(`/jornadas/${id}/handoff`, { metodo: "POST", corpo: { gerente_id }, token }),
  /** G3: o aceite cita a versão vista; a API recusa se já houver outra mais nova. */
  aceitarHandoff: (token: string, id: number, versao: number) =>
    requisitar<{ estado: EstadoJornada; versao: number }>(`/jornadas/${id}/handoff/aceitar`, {
      metodo: "POST",
      corpo: { versao },
      token,
    }),
  devolverHandoff: (token: string, id: number, comentario: string) =>
    requisitar<{ estado: EstadoJornada }>(`/jornadas/${id}/handoff/devolver`, {
      metodo: "POST",
      corpo: { comentario },
      token,
    }),
};

export const apiDiretoria = {
  painel: (token: string, { dias, analista_id, gerente_id }: FiltrosPainel) => {
    const params = new URLSearchParams({ dias: String(dias) });
    if (analista_id) params.set("analista_id", String(analista_id));
    if (gerente_id) params.set("gerente_id", String(gerente_id));
    return requisitar<PainelFunil>(`/painel/funil?${params}`, { token });
  },
  permissoes: (token: string) => requisitar<MatrizPermissoes>("/permissoes", { token }),
  usuarios: (token: string) => requisitar<Usuario[]>("/usuarios", { token }),
  convidar: (token: string, dados: ConviteEntrada) =>
    requisitar<Usuario>("/usuarios/convidar", { metodo: "POST", corpo: dados, token }),
  /** A API recusa, por exemplo, desativar ou rebaixar a última conta da Diretoria. */
  atualizarUsuario: (token: string, id: number, dados: UsuarioPatch) =>
    requisitar<Usuario>(`/usuarios/${id}`, { metodo: "PATCH", corpo: dados, token }),
};

export const apiBusca = {
  /** A API só devolve leads que o perfil pode ver. */
  leads: (token: string, texto: string) =>
    requisitar<{ leads: LeadEncontrado[] }>(`/busca?q=${encodeURIComponent(texto)}`, { token }),
};

export const apiNotificacoes = {
  listar: (token: string) => requisitar<{ itens: Notificacao[] }>("/notificacoes", { token }),
  marcarLidas: (token: string) => requisitar<unknown>("/notificacoes/lidas", { metodo: "POST", token }),
};
