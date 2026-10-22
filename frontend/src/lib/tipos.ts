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
