"use client";

import { useEffect, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { PacoteCompleto } from "@/lib/tipos";
import { TabelaRequisitosG3 } from "./TabelaRequisitosG3";

interface PainelPacoteProps {
  pacoteId: number;
  aoFechar: () => void;
}

/** Prévia somente leitura do snapshot do pacote: as 16 seções, cada item com a evidência a um clique. */
export function PainelPacote({ pacoteId, aoFechar }: PainelPacoteProps) {
  const { sessao } = useAuth();
  const token = sessao!.token;
  const [pacote, setPacote] = useState<PacoteCompleto | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    apiJornadas
      .pacote(token, pacoteId)
      .then((p) => ativo && (setPacote(p), setErro(null)))
      .catch((e: unknown) => ativo && setErro(e instanceof ErroApi ? e.message : "Não foi possível abrir o pacote."));
    return () => {
      ativo = false;
    };
  }, [token, pacoteId]);

  if (!pacote) {
    return (
      <section className="rounded-xl border-2 border-azul bg-white p-6">
        {erro ? <AlertaErro mensagem={erro} /> : <p role="status" className="text-sm text-cinza">Abrindo pacote…</p>}
      </section>
    );
  }

  return (
    <section aria-label="Pacote aberto" className="rounded-xl border-2 border-azul bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)] lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-azul-escuro">Pacote de handoff · v{pacote.versao}</h2>
          <p className="mt-1 text-[15px] text-cinza">
            Snapshot imutável · só nova versão altera · {pacote.resumo.secoes_preenchidas} de {pacote.resumo.secoes_total} seções ·
            hash {pacote.hash.slice(0, 8)}…
          </p>
        </div>
        <button
          type="button"
          onClick={aoFechar}
          className="h-11 rounded-lg px-4 font-bold text-azul-escuro transition hover:bg-fundo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40"
        >
          Fechar
        </button>
      </div>
      <div className="mt-4">
        <TabelaRequisitosG3 visao={{ secoes: pacote.secoes, nao_informados: [] }} embutido />
      </div>
    </section>
  );
}
