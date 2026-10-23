"use client";

import Link from "next/link";
import { useState } from "react";
import { IconeSino } from "@/components/icones";
import { apiNotificacoes } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLeitura } from "@/lib/useLeitura";

export function Notificacoes() {
  const { sessao } = useAuth();
  const token = sessao!.token; // o layout (app) só monta o cabeçalho com sessão
  const { dados, recarregar } = useLeitura(`notificacoes:${token}`, () => apiNotificacoes.listar(token), {
    intervaloMs: 30_000,
  });
  const [aberto, setAberto] = useState(false);
  const itens = dados?.itens ?? [];
  const naoLidas = itens.some((n) => !n.lida);

  function alternar() {
    setAberto(!aberto);
    if (!aberto && naoLidas) apiNotificacoes.marcarLidas(token).then(recarregar, () => {});
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={alternar}
        aria-label="Notificações"
        aria-expanded={aberto}
        className="relative grid h-11 w-11 place-items-center rounded-full border border-slate-300 bg-white text-tinta shadow-sm transition hover:border-azul hover:text-azul focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30"
      >
        <IconeSino className="h-5 w-5" />
        {naoLidas && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-perigo" />}
      </button>
      {aberto && (
        <ul className="absolute right-0 top-full z-20 mt-2 max-h-96 w-96 max-w-[90vw] overflow-auto rounded-lg border border-slate-300 bg-white py-1 shadow-lg">
          {itens.length === 0 && <li className="px-4 py-3 text-sm text-cinza">Nenhuma notificação.</li>}
          {itens.map((n) => (
            <li key={n.id} className={n.lida ? "" : "bg-azul-suave"}>
              <Link
                href={n.jornada_id ? `/jornadas/${n.jornada_id}` : "#"}
                onClick={() => setAberto(false)}
                className="block px-4 py-3 text-sm text-tinta hover:bg-slate-50"
              >
                {n.texto}
                <span className="mt-1 block text-xs text-cinza">{new Date(n.quando).toLocaleString("pt-BR")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
