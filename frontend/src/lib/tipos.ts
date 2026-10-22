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
