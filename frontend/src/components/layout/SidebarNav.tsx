"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeSair } from "@/components/icones";
import { FaixasDiagonais } from "@/components/marca/Decoracoes";
import { Logo } from "@/components/marca/Logo";
import { clipRecortado } from "@/components/marca/recorte";
import { useAuth } from "@/lib/auth/AuthContext";
import { iniciais, MENU_POR_PAPEL } from "@/lib/rotas";
import { SwitchModoDemo } from "./SwitchModoDemo";

const CLIP_SIDEBAR = clipRecortado({ direita: true }, 4, 5);

export function SidebarNav() {
  const { sessao, sair } = useAuth();
  const caminho = usePathname();
  if (!sessao) return null;
  const { usuario } = sessao;
  const itens = MENU_POR_PAPEL[usuario.papel];

  return (
    <aside
      className="relative flex shrink-0 flex-col overflow-hidden bg-marinho px-5 pb-6 pt-8 text-white lg:sticky lg:top-0 lg:h-screen lg:w-72"
      style={{ clipPath: CLIP_SIDEBAR }}
    >
      {usuario.papel === "admin" && <FaixasDiagonais className="opacity-60" />}

      <Link href={itens[0].href} className="relative self-start">
        <Logo variante="verde" className="h-12 w-auto" />
      </Link>

      <nav aria-label="Menu principal" className="relative mt-10">
        <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wide text-white/70">Menu</p>
        <ul className="space-y-2">
          {itens.map((item) => {
            const ativo = caminho === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`relative flex items-center gap-4 rounded-lg px-5 py-3 text-[17px] transition ${
                    ativo ? "bg-azul-escuro font-bold" : "text-white/85 hover:bg-white/5"
                  }`}
                >
                  {ativo && <span className="absolute -left-1 top-2 bottom-2 w-1 rounded-full bg-lima" />}
                  <span className={`h-2 w-2 rounded-full ${ativo ? "bg-lima" : "bg-azul"}`} />
                  {item.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative mt-10 border-t border-azul/60 pt-5 lg:mt-auto">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/70">Perfil</p>
        <SwitchModoDemo />
        <div className="mt-4 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lima text-sm font-bold text-azul-escuro">
            {iniciais(usuario.nome)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-bold">{usuario.nome}</p>
            <p className="text-sm text-white/70">Seed a Bit</p>
          </div>
          <button
            type="button"
            onClick={sair}
            title="Sair"
            aria-label="Sair"
            className="rounded-md p-2 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-lima"
          >
            <IconeSair className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
