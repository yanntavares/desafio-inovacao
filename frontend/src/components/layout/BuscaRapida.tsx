"use client";

import Link from "next/link";
import { useState } from "react";
import { apiBusca } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { LeadEncontrado } from "@/lib/tipos";

export function BuscaRapida() {
  const { sessao } = useAuth();
  const [texto, setTexto] = useState("");
  const [achados, setAchados] = useState<LeadEncontrado[]>([]);
  const token = sessao?.token;

  function buscar(valor: string) {
    setTexto(valor);
    if (!token || valor.trim().length < 2) return setAchados([]);
    apiBusca.leads(token, valor).then(
      (r) => setAchados(r.leads),
      () => setAchados([]),
    );
  }

  return (
    <div className="relative w-full max-w-sm">
      <input
        type="search"
        aria-label="Buscar lead ou negócio"
        value={texto}
        onChange={(e) => buscar(e.target.value)}
        placeholder="Buscar lead, negócio…"
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-[15px] text-tinta shadow-sm outline-none transition placeholder:text-cinza/70 focus:border-azul focus:ring-2 focus:ring-azul/30"
      />
      {texto.trim().length >= 2 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-300 bg-white py-1 shadow-lg">
          {achados.length === 0 && <li className="px-4 py-2 text-sm text-cinza">Nenhum lead encontrado.</li>}
          {achados.map((a) => (
            <li key={a.id}>
              <Link href={`/jornadas/${a.id}`} onClick={() => buscar("")} className="block px-4 py-2 hover:bg-azul-suave">
                <span className="font-semibold text-tinta">{a.cliente}</span>{" "}
                <span className="text-sm text-cinza">· {a.titulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
