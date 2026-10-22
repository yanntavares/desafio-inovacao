import type { Papel } from "./tipos";

export interface ItemMenu {
  rotulo: string;
  href: string;
}

// Espelha docs/telas: o menu muda por perfil; a API recusa o que o papel não pode.
export const MENU_POR_PAPEL: Record<Papel, ItemMenu[]> = {
  comercial: [
    { rotulo: "Kanban de leads", href: "/kanban/meus-leads" },
    { rotulo: "Cadastrar reunião", href: "/reunioes/cadastrar" },
    { rotulo: "Histórico", href: "/historico" },
  ],
  gerente: [
    { rotulo: "Kanban geral", href: "/kanban/geral" },
    { rotulo: "Cadastrar reunião", href: "/reunioes/cadastrar" },
    { rotulo: "Histórico", href: "/historico" },
  ],
  tecnico: [
    { rotulo: "Kanban geral", href: "/kanban/geral" },
    { rotulo: "Histórico", href: "/historico" },
  ],
  admin: [
    { rotulo: "Visão geral do funil", href: "/diretoria" },
    { rotulo: "Kanban geral", href: "/kanban/geral" },
    { rotulo: "Usuários", href: "/diretoria/usuarios" },
  ],
};

export const ROTULO_PAPEL: Record<Papel, string> = {
  comercial: "Analista de negócios",
  gerente: "Gerente de projetos",
  tecnico: "Equipe técnica",
  admin: "Diretoria",
};

export function rotaInicial(papel: Papel): string {
  return MENU_POR_PAPEL[papel][0].href;
}

// Rotas fora do menu que todos os perfis autenticados podem abrir.
const ROTAS_COMUNS = ["/jornadas"];

export function podeAbrir(papel: Papel, caminho: string): boolean {
  const permitidas = [...MENU_POR_PAPEL[papel].map((i) => i.href), ...ROTAS_COMUNS];
  return permitidas.some((r) => caminho === r || caminho.startsWith(`${r}/`));
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (partes[0][0] + ultima).toUpperCase();
}
