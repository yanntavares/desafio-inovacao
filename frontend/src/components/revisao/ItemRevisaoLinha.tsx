"use client";

import { useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { ChipNatureza, ChipOrigem } from "@/components/jornada/ChipNatureza";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { AcaoItem, CategoriaItem, ItemRevisao, NaturezaItem, StatusValidacao } from "@/lib/tipos";

/** A natureza final é decisão de pessoa: só estas duas. "Sugestão da IA" é o que ainda não foi decidido. */
export const NATUREZAS_DECIDIVEIS: { valor: NaturezaItem; rotulo: string; dica: string }[] = [
  { valor: "acordado", rotulo: "Acordado", dica: "Fechado com o cliente." },
  { valor: "em_discussao", rotulo: "Em discussão", dica: "Citado, mas ainda não fechado." },
];

const ROTULO_NATUREZA: Record<NaturezaItem, string> = {
  acordado: "Acordado",
  em_discussao: "Em discussão",
  sugestao_ia: "Sugestão da IA",
};

const STATUS: Record<StatusValidacao, { rotulo: string; classe: string }> = {
  pendente: { rotulo: "Pendente", classe: "bg-slate-100 text-tinta" },
  confirmado: { rotulo: "Confirmado", classe: "bg-emerald-50 text-emerald-800" },
  editado: { rotulo: "Editado", classe: "bg-sky-50 text-azul-escuro" },
  rejeitado: { rotulo: "Rejeitado", classe: "bg-perigo-suave text-perigo" },
};

export function ChipStatus({ status }: { status: StatusValidacao }) {
  const e = STATUS[status];
  return <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${e.classe}`}>{e.rotulo}</span>;
}

interface ItemRevisaoLinhaProps {
  item: ItemRevisao;
  aberto: boolean;
  aoAlternar: () => void;
  /** null = pode revisar; texto = motivo escrito de por que não pode. */
  motivoSemAcao: string | null;
  categorias: { valor: CategoriaItem; titulo: string }[];
  aoRevisar: () => void;
}

export function ItemRevisaoLinha({ item, aberto, aoAlternar, motivoSemAcao, categorias, aoRevisar }: ItemRevisaoLinhaProps) {
  const { sessao } = useAuth();
  const token = sessao!.token;
  // Natureza começa vazia: quem confirma escolhe. A sugestão da IA aparece como dica, nunca como valor.
  const [natureza, setNatureza] = useState<NaturezaItem | null>(null);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(item.descricao);
  const [categoria, setCategoria] = useState<CategoriaItem>(item.categoria);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(acao: AcaoItem) {
    setOcupado(true);
    setErro(null);
    try {
      await apiJornadas.revisarItem(token, item.id, {
        acao,
        natureza_final: acao === "rejeitar" ? undefined : (natureza ?? undefined),
        descricao: acao === "editar" ? texto : undefined,
        categoria: acao === "editar" ? categoria : undefined,
      });
      setEditando(false);
      aoRevisar();
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível salvar. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  const rejeitado = item.status_validacao === "rejeitado";
  const semNatureza = natureza === null;
  const textoInvalido = editando && texto.trim().length === 0;
  const motivoBotao = semNatureza ? "Escolha a natureza do item: a IA não decide." : null;

  return (
    <li className={`rounded-xl border-2 bg-white shadow-sm ${aberto ? "border-azul" : "border-slate-300"}`}>
      <button
        type="button"
        onClick={aoAlternar}
        aria-expanded={aberto}
        className="flex w-full flex-col gap-2 rounded-xl px-4 py-3 text-left transition hover:bg-azul-suave/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30"
      >
        <span className={`text-[15px] ${rejeitado ? "text-cinza line-through" : "text-tinta"}`}>{item.descricao}</span>
        <span className="flex flex-wrap items-center gap-2">
          <ChipStatus status={item.status_validacao} />
          {item.natureza_final ? (
            <ChipNatureza natureza={item.natureza_final} />
          ) : (
            item.natureza_proposta && (
              // proposta da IA não é decisão: chip tracejado, diferente do chip de natureza decidida
              <span
                title="Proposta da IA. Só vale quando uma pessoa confirma."
                className="inline-flex shrink-0 rounded-full border border-dashed border-slate-400 px-3 py-1 text-xs font-semibold text-cinza"
              >
                IA propõe: {ROTULO_NATUREZA[item.natureza_proposta]}
              </span>
            )
          )}
          <ChipOrigem origem={item.origem} />
          {item.sem_evidencia && (
            <span title="Sem trecho literal na transcrição: tratado como inferido." className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Sem evidência
            </span>
          )}
        </span>
      </button>

      {aberto && (
        <div role="group" aria-label="Revisar item" className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4">
          {item.natureza_proposta && item.status_validacao === "pendente" && (
            <p className="text-sm text-cinza">
              A IA propôs: <strong className="text-tinta">{ROTULO_NATUREZA[item.natureza_proposta]}</strong>. Quem decide é você.
            </p>
          )}

          {motivoSemAcao ? (
            <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-tinta">{motivoSemAcao}</p>
          ) : (
            <>
              {editando && (
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-semibold text-tinta">
                    Texto do item
                    <textarea
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] font-normal outline-none focus:border-azul focus:ring-2 focus:ring-azul/30"
                    />
                  </label>
                  <label className="text-sm font-semibold text-tinta">
                    Seção
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value as CategoriaItem)}
                      className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-normal outline-none focus:border-azul focus:ring-2 focus:ring-azul/30"
                    >
                      {categorias.map((c) => (
                        <option key={c.valor} value={c.valor}>
                          {c.titulo}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <fieldset className="flex flex-wrap items-center gap-3">
                <legend className="mb-2 text-sm font-semibold text-tinta">Natureza</legend>
                {NATUREZAS_DECIDIVEIS.map((n) => (
                  <label
                    key={n.valor}
                    title={n.dica}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 text-[15px] font-semibold transition ${
                      natureza === n.valor ? "border-azul bg-azul-suave text-azul-escuro" : "border-slate-300 bg-white text-tinta hover:border-azul"
                    }`}
                  >
                    <input type="radio" name={`natureza-${item.id}`} checked={natureza === n.valor} onChange={() => setNatureza(n.valor)} className="accent-azul" />
                    {n.rotulo}
                  </label>
                ))}
              </fieldset>

              <AlertaErro mensagem={erro} />

              <div className="flex flex-wrap items-center gap-3">
                {editando ? (
                  <>
                    <button
                      type="button"
                      disabled={semNatureza || textoInvalido || ocupado}
                      onClick={() => enviar("editar")}
                      className="h-11 rounded-lg bg-azul px-5 font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Salvar edição
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditando(false);
                        setTexto(item.descricao);
                        setCategoria(item.categoria);
                      }}
                      className="h-11 rounded-lg border-2 border-slate-300 px-5 font-bold text-tinta transition hover:border-azul focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={semNatureza || ocupado}
                      onClick={() => enviar("confirmar")}
                      className="h-11 rounded-lg bg-azul px-5 font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => setEditando(true)}
                      className="h-11 rounded-lg border-2 border-azul px-5 font-bold text-azul transition hover:bg-azul-suave focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30 disabled:opacity-60"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => enviar("rejeitar")}
                      className="h-11 rounded-lg border-2 border-perigo px-5 font-bold text-perigo transition hover:bg-perigo-suave focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-perigo/30 disabled:opacity-60"
                    >
                      Rejeitar
                    </button>
                  </>
                )}
              </div>
              {(motivoBotao || textoInvalido) && (
                <p className="text-sm text-cinza">{textoInvalido ? "Informe o novo texto do item." : motivoBotao}</p>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
