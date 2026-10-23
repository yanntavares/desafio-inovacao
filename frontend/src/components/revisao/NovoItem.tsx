"use client";

import { useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { CategoriaItem, NaturezaItem } from "@/lib/tipos";
import { NATUREZAS_DECIDIVEIS } from "./ItemRevisaoLinha";

interface NovoItemProps {
  jornadaId: number;
  categorias: { valor: CategoriaItem; titulo: string }[];
  aoAdicionar: () => void;
}

/** "Adicionar item": o que a IA não captou. Entra como manual, já confirmado, com a natureza que a pessoa escolher. */
export function NovoItem({ jornadaId, categorias, aoAdicionar }: NovoItemProps) {
  const { sessao } = useAuth();
  const token = sessao!.token;
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaItem | "">("");
  const [descricao, setDescricao] = useState("");
  const [natureza, setNatureza] = useState<NaturezaItem | "">("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const falta = !categoria ? "Escolha a seção." : !descricao.trim() ? "Descreva o item." : !natureza ? "Escolha a natureza do item." : null;

  async function adicionar() {
    if (!categoria || !natureza) return;
    setOcupado(true);
    setErro(null);
    try {
      await apiJornadas.adicionarItem(token, jornadaId, { categoria, descricao, natureza_final: natureza });
      setCategoria("");
      setDescricao("");
      setNatureza("");
      setAberto(false);
      aoAdicionar();
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível adicionar o item. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="h-11 self-start rounded-lg border-2 border-azul px-5 font-bold text-azul transition hover:bg-azul-suave focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30"
      >
        Adicionar item
      </button>
    );
  }

  return (
    <section aria-label="Adicionar item" className="flex flex-col gap-3 rounded-xl border-2 border-azul bg-white p-4 shadow-sm">
      <h3 className="text-lg font-bold text-azul-escuro">Adicionar item</h3>
      <label className="text-sm font-semibold text-tinta">
        Seção
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaItem | "")}
          className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-normal outline-none focus:border-azul focus:ring-2 focus:ring-azul/30"
        >
          <option value="">Selecione…</option>
          {categorias.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.titulo}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-tinta">
        Descrição
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] font-normal outline-none focus:border-azul focus:ring-2 focus:ring-azul/30"
        />
      </label>
      <label className="text-sm font-semibold text-tinta">
        Natureza
        <select
          value={natureza}
          onChange={(e) => setNatureza(e.target.value as NaturezaItem | "")}
          className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-normal outline-none focus:border-azul focus:ring-2 focus:ring-azul/30"
        >
          <option value="">Selecione…</option>
          {NATUREZAS_DECIDIVEIS.map((n) => (
            <option key={n.valor} value={n.valor}>
              {n.rotulo}
            </option>
          ))}
        </select>
      </label>
      <AlertaErro mensagem={erro} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!!falta || ocupado}
          onClick={adicionar}
          className="h-11 rounded-lg bg-azul px-5 font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ocupado ? "Adicionando…" : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="h-11 rounded-lg border-2 border-slate-300 px-5 font-bold text-tinta transition hover:border-azul focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30"
        >
          Cancelar
        </button>
      </div>
      {falta && <p className="text-sm text-cinza">{falta}</p>}
    </section>
  );
}
