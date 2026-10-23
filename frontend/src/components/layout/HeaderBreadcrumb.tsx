"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { iniciais, MENU_POR_PAPEL } from "@/lib/rotas";
import { BuscaRapida } from "./BuscaRapida";
import { Notificacoes } from "./Notificacoes";

/** `titulo`: o que a página informou por `useMigalha` (o nome do lead na página do lead). */
export function HeaderBreadcrumb({ titulo }: { titulo: string | null }) {
  const { sessao } = useAuth();
  const caminho = usePathname();
  if (!sessao) return null;
  const { usuario } = sessao;

  const menu = MENU_POR_PAPEL[usuario.papel];
  const atual = menu.find((i) => caminho === i.href || caminho.startsWith(`${i.href}/`));
  // Telas 05/06: as páginas internas partem do kanban ("Kanban de leads › Cadastrar reunião").
  const raiz =
    usuario.papel === "admin" ? ["Diretoria"] : atual && atual !== menu[0] && !atual.semRaiz ? [menu[0].rotulo] : [];
  // O lead não está no menu: a trilha parte do kanban do perfil e termina no nome do cliente.
  const noLead = caminho.startsWith("/jornadas/");
  const trilha = noLead ? [menu[0].rotulo, titulo ?? "Página do lead"] : [...raiz, atual?.rotulo ?? "Ponte"];

  return (
    <header className="sticky top-0 z-10 flex h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)] lg:px-8 xl:px-10">
      <nav aria-label="Trilha" className="flex min-w-0 items-center gap-2 text-[17px]">
        {trilha.map((parte, i) => (
          <Fragment key={parte}>
            {i > 0 && <span className="text-cinza">›</span>}
            <span className={i === trilha.length - 1 ? "truncate font-bold text-azul-escuro" : "text-cinza"}>{parte}</span>
          </Fragment>
        ))}
      </nav>
      <div className="flex flex-1 items-center justify-end gap-3">
        <BuscaRapida />
        <Notificacoes />
        <span
          title={`${usuario.nome} · ${usuario.perfil}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-azul-suave text-sm font-bold text-azul-escuro"
        >
          {iniciais(usuario.nome)}
        </span>
      </div>
    </header>
  );
}
