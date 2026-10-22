import type {
  CadastroEntrada,
  FiltrosKanban,
  LoginEntrada,
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
  listar: (token: string, { analista_id, negocio_id, so_bloqueantes }: FiltrosKanban) => {
    const params = new URLSearchParams();
    if (analista_id) params.set("analista_id", String(analista_id));
    if (negocio_id) params.set("negocio_id", String(negocio_id));
    if (so_bloqueantes) params.set("so_bloqueantes", "true");
    const consulta = params.toString();
    return requisitar<RespostaKanban>(`/kanban${consulta ? `?${consulta}` : ""}`, { token });
  },
};
