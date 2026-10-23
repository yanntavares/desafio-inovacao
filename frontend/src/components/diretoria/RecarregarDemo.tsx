"use client";

import { useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiDiretoria, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";

/** A2: volta a demonstração ao roteiro do pitch. Só aparece em sessão de demonstração. */
export function RecarregarDemo() {
  const { sessao, trocarPapelDemo } = useAuth();
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!sessao?.demo) return null;

  async function recarregar() {
    setOcupado(true);
    setErro(null);
    try {
      await apiDiretoria.recarregarDemo(sessao!.token);
      // As contas são recriadas com outros ids: entra de novo como Diretoria e relê tudo.
      await trocarPapelDemo("admin");
      window.location.reload();
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível recarregar a demonstração. Tente de novo.");
      setOcupado(false);
      setConfirmando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {confirmando ? (
        <div className="rounded-lg bg-lima-suave px-4 py-3 text-[15px] text-azul-escuro">
          <p className="font-bold">Apagar tudo e recarregar os dados fictícios da demonstração?</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={recarregar}
              disabled={ocupado}
              className="h-10 rounded-lg bg-azul px-4 font-bold text-white hover:bg-[#04549a] disabled:opacity-60"
            >
              {ocupado ? "Recarregando…" : "Sim, recarregar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={ocupado}
              className="h-10 rounded-lg px-4 font-bold text-azul-escuro hover:bg-white/60"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="h-11 rounded-lg bg-azul-suave px-4 font-bold text-azul transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40"
        >
          Recarregar demonstração
        </button>
      )}
      <AlertaErro mensagem={erro} />
    </div>
  );
}
