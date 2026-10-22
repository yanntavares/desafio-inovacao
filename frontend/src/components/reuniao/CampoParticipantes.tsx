"use client";

import { useId, useState } from "react";
import { IconeFechar, IconeMais } from "@/components/icones";
import { iniciais } from "@/lib/rotas";
import type { Participante } from "@/lib/tipos";

interface CampoParticipantesProps {
  participantes: Participante[];
  aoMudar: (participantes: Participante[]) => void;
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Chips de participantes (tela 05) com inclusão inline; "cliente" vira o sufixo "(cliente)". */
export function CampoParticipantes({ participantes, aoMudar }: CampoParticipantesProps) {
  const id = useId();
  const [adicionando, setAdicionando] = useState(false);
  const [nome, setNome] = useState("");
  const [cliente, setCliente] = useState(true);

  function adicionar() {
    const limpo = nome.trim().replace(/\s+/g, " ");
    if (!limpo) return;
    const repetido = participantes.some((p) => p.nome.toLowerCase() === limpo.toLowerCase());
    if (!repetido) aoMudar([...participantes, { nome: limpo, cliente }]);
    setNome("");
    setAdicionando(false);
  }

  return (
    <div>
      <span id={`${id}-rotulo`} className="mb-1.5 block text-sm font-semibold text-tinta">
        Participantes *
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-rotulo`}
        className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white py-1.5 pl-2 pr-1.5"
      >
        {participantes.length === 0 && <span className="px-2 text-[15px] text-cinza/70">Ninguém adicionado</span>}
        {participantes.map((p, i) => (
          <span
            key={p.nome}
            className="flex items-center gap-1.5 rounded-full bg-azul-suave py-1 pl-1 pr-2 text-sm font-semibold text-azul-escuro"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-azul text-[10px] font-bold text-white">
              {iniciais(p.nome)}
            </span>
            {primeiroNome(p.nome)}
            {p.cliente && " (cliente)"}
            <button
              type="button"
              onClick={() => aoMudar(participantes.filter((_, j) => j !== i))}
              aria-label={`Remover ${p.nome}`}
              className="ml-0.5 rounded-full p-0.5 text-azul-escuro/60 hover:bg-white hover:text-perigo"
            >
              <IconeFechar className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {!adicionando && (
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            aria-label="Adicionar participante"
            className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-azul hover:bg-azul-suave"
          >
            <IconeMais className="h-5 w-5" />
          </button>
        )}
      </div>

      {adicionando && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-azul/30 bg-azul-suave/40 p-2">
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // não submete o formulário da reunião
                adicionar();
              } else if (e.key === "Escape") {
                setAdicionando(false);
              }
            }}
            placeholder="Nome do participante"
            aria-label="Nome do participante"
            className="h-10 min-w-40 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-azul focus:ring-2 focus:ring-azul/30"
          />
          <label className="flex items-center gap-1.5 text-sm text-tinta">
            <input
              type="checkbox"
              checked={cliente}
              onChange={(e) => setCliente(e.target.checked)}
              className="h-4 w-4 accent-azul"
            />
            Do cliente
          </label>
          <button
            type="button"
            onClick={adicionar}
            disabled={!nome.trim()}
            className="h-10 rounded-md bg-azul px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Adicionar
          </button>
          <button
            type="button"
            onClick={() => setAdicionando(false)}
            className="h-10 px-2 text-sm font-semibold text-cinza hover:text-tinta"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
