import type { Papel } from "@/lib/tipos";

export const CLASSE_CARTAO = "rounded-xl border border-slate-200 bg-white shadow-[0_2px_4px_rgba(15,27,45,0.06)]";

/** Rótulos curtos da tabela e da matriz (tela 03); o nome completo vem da API em `perfil`. */
export const PAPEL_CURTO: Record<Papel, string> = {
  comercial: "Analista",
  gerente: "Gerente",
  tecnico: "Técnico",
  admin: "Diretoria",
};
