"use client";

import { useState } from "react";
import type { ItemSecao, NaturezaItem, VisaoGeral } from "@/lib/tipos";
import { ChipNatureza, ChipOrigem } from "./ChipNatureza";
import { TrechoEvidencia } from "./TrechoEvidencia";

function LinhaItem({ item, natureza }: { item: ItemSecao; natureza: NaturezaItem }) {
  const [aberta, setAberta] = useState(false);

  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
        <button
          type="button"
          onClick={() => setAberta((a) => !a)}
          aria-expanded={aberta}
          title="Ver o trecho da transcrição que sustenta este item"
          className="min-w-0 flex-1 text-left text-[16px] text-tinta underline-offset-4 hover:text-azul hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40"
        >
          {item.descricao}
        </button>
        <ChipOrigem origem={item.origem} />
        <ChipNatureza natureza={natureza} />
      </div>
      {aberta && <TrechoEvidencia itemId={item.id} />}
    </li>
  );
}

const ORDEM: NaturezaItem[] = ["acordado", "em_discussao", "sugestao_ia"];

/** Visão geral do pacote: as 16 seções com a natureza decidida por pessoa e a evidência a um clique. */
export function TabelaRequisitosG3({ visao }: { visao: VisaoGeral }) {
  const secoes = Object.entries(visao.secoes);
  const comItens = secoes.filter(([, s]) => ORDEM.some((n) => s[n].length > 0));
  const vazias = secoes.filter(([, s]) => ORDEM.every((n) => s[n].length === 0));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)] lg:p-8">
      <h2 className="text-2xl font-bold text-azul-escuro">Visão geral do projeto</h2>
      <p className="mt-1 text-sm text-cinza">Clique em um item para ver o trecho da transcrição.</p>

      {comItens.length === 0 && (
        <p className="mt-6 text-[15px] text-cinza">Nenhum item extraído ainda. Os itens aparecem quando a extração termina.</p>
      )}

      <div className="mt-4 divide-y divide-slate-100">
        {comItens.map(([chave, secao]) => (
          <div key={chave} className="py-4">
            <h3 className="text-sm font-semibold text-cinza">{secao.titulo}</h3>
            <ul className="mt-1">
              {ORDEM.flatMap((natureza) =>
                secao[natureza].map((item) => <LinhaItem key={item.id} item={item} natureza={natureza} />),
              )}
            </ul>
          </div>
        ))}
      </div>

      {vazias.length > 0 && (
        <div className="mt-2 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-cinza">Sem informação na reunião</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {vazias.map(([chave, secao]) => (
              <li key={chave} className="flex items-center justify-between gap-3 text-[16px] text-tinta">
                {secao.titulo}
                <ChipNatureza natureza="nao_informado" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
