"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconeSeta } from "@/components/icones";
import { ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { rotaInicial, ROTULO_PAPEL } from "@/lib/rotas";
import type { Papel } from "@/lib/tipos";

const PAPEIS_DEMO: Papel[] = ["comercial", "gerente", "admin"];

/** Rodapé da sidebar: em sessão de demonstração troca o papel na hora; fora dela só mostra o perfil. */
export function SwitchModoDemo() {
  const { sessao, trocarPapelDemo } = useAuth();
  const router = useRouter();
  const [trocando, setTrocando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!sessao) return null;
  const papel = sessao.usuario.papel;

  if (!sessao.demo) {
    return (
      <div className="rounded-lg bg-azul px-4 py-2.5 text-[15px] font-bold text-white">{ROTULO_PAPEL[papel]}</div>
    );
  }

  async function trocar(novo: Papel) {
    if (novo === papel) return;
    setErro(null);
    setTrocando(true);
    try {
      const nova = await trocarPapelDemo(novo);
      router.replace(rotaInicial(nova.usuario.papel));
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível trocar de perfil. Tente de novo.");
    } finally {
      setTrocando(false);
    }
  }

  return (
    <div>
      <label htmlFor="switch-modo-demo" className="sr-only">
        Trocar perfil de demonstração
      </label>
      <div className="relative">
        <select
          id="switch-modo-demo"
          value={papel}
          disabled={trocando}
          onChange={(e) => trocar(e.target.value as Papel)}
          className="h-11 w-full cursor-pointer appearance-none rounded-lg bg-azul pl-4 pr-10 text-[15px] font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-lima disabled:cursor-wait disabled:opacity-70"
        >
          {PAPEIS_DEMO.map((p) => (
            <option key={p} value={p} className="bg-white text-tinta">
              {ROTULO_PAPEL[p]}
            </option>
          ))}
        </select>
        <IconeSeta className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
      </div>
      {erro && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {erro}
        </p>
      )}
    </div>
  );
}
