"use client";

import { useState } from "react";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { ItemRevisao, NaturezaItem, Pendencia, ResolucaoPendencia, StatusValidacao, VisaoGeral } from "@/lib/tipos";
import { ChipNatureza, ChipOrigem } from "./ChipNatureza";
import { TrechoEvidencia } from "./TrechoEvidencia";

const NATUREZAS: { valor: NaturezaItem; rotulo: string }[] = [
  { valor: "acordado", rotulo: "Acordado" },
  { valor: "em_discussao", rotulo: "Em discussão" },
  { valor: "sugestao_ia", rotulo: "Sugestão da IA" },
];

const STATUS_ITEM: Record<StatusValidacao, { rotulo: string; classe: string }> = {
  pendente: { rotulo: "A revisar", classe: "bg-amber-50 text-amber-800" },
  confirmado: { rotulo: "Confirmado", classe: "bg-emerald-50 text-emerald-800" },
  editado: { rotulo: "Editado", classe: "bg-emerald-50 text-emerald-800" },
  rejeitado: { rotulo: "Rejeitado", classe: "bg-slate-100 text-cinza" },
};

const STATUS_PENDENCIA: Record<Pendencia["status"], string> = {
  aberta: "Aberta",
  resolvida: "Resolvida",
  esclarecida: "Esclarecida",
  aceita_com_risco: "Aceita com risco",
};

const CAMPO =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] text-tinta focus:border-azul focus:outline-none focus:ring-4 focus:ring-azul/20";
const BOTAO =
  "h-10 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30 disabled:cursor-not-allowed disabled:opacity-50";

function mensagem(e: unknown, padrao: string): string {
  return e instanceof ErroApi ? e.message : padrao;
}

interface LinhaRevisaoProps {
  item: ItemRevisao;
  podeRevisar: boolean;
  aoSalvar: () => void;
}

function LinhaRevisao({ item, podeRevisar, aoSalvar }: LinhaRevisaoProps) {
  const { sessao } = useAuth();
  // Parte da proposta da IA, mas só vale quando a pessoa confirma ou edita.
  const [natureza, setNatureza] = useState<NaturezaItem>(item.natureza_final ?? item.natureza_proposta ?? "em_discussao");
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(item.descricao);
  const [evidencia, setEvidencia] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const rejeitado = item.status_validacao === "rejeitado";
  const status = STATUS_ITEM[item.status_validacao];

  async function revisar(acao: "confirmar" | "editar" | "rejeitar") {
    setSalvando(true);
    setErro(null);
    try {
      await apiJornadas.revisarItem(
        sessao!.token,
        item.id,
        acao === "rejeitar" ? { acao } : { acao, natureza_final: natureza, descricao: acao === "editar" ? texto.trim() : undefined },
      );
      setEditando(false);
      aoSalvar();
    } catch (e: unknown) {
      setErro(mensagem(e, "Não foi possível salvar a revisão. Tente de novo."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <li className={`py-4 ${rejeitado ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start gap-3">
        {editando ? (
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            aria-label="Novo texto do item"
            className={`${CAMPO} min-w-0 flex-1`}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEvidencia((a) => !a)}
            aria-expanded={evidencia}
            title="Ver o trecho da transcrição que sustenta este item"
            className={`min-w-0 flex-1 text-left text-[16px] text-tinta underline-offset-4 hover:text-azul hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 ${rejeitado ? "line-through" : ""}`}
          >
            {item.descricao}
          </button>
        )}
        <ChipOrigem origem={item.origem} />
        {item.natureza_final ? (
          <ChipNatureza natureza={item.natureza_final} />
        ) : (
          item.natureza_proposta && (
            <span className="text-xs font-semibold text-violet-800" title="Proposta da IA: só vale depois da revisão.">
              IA propõe: {NATUREZAS.find((n) => n.valor === item.natureza_proposta)?.rotulo}
            </span>
          )
        )}
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.classe}`}>{status.rotulo}</span>
      </div>

      {evidencia && !editando && <TrechoEvidencia itemId={item.id} />}

      {podeRevisar && !rejeitado && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={natureza}
            onChange={(e) => setNatureza(e.target.value as NaturezaItem)}
            aria-label="Natureza do item"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-tinta focus:border-azul focus:outline-none focus:ring-4 focus:ring-azul/20"
          >
            {NATUREZAS.map((n) => (
              <option key={n.valor} value={n.valor}>
                {n.rotulo}
              </option>
            ))}
          </select>
          {editando ? (
            <>
              <button
                type="button"
                onClick={() => revisar("editar")}
                disabled={salvando || !texto.trim()}
                title={texto.trim() ? undefined : "Escreva o novo texto do item."}
                className={`${BOTAO} bg-azul text-white hover:bg-[#04549a]`}
              >
                Salvar edição
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setTexto(item.descricao);
                }}
                disabled={salvando}
                className={`${BOTAO} text-cinza hover:bg-slate-100`}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => revisar("confirmar")}
                disabled={salvando}
                className={`${BOTAO} bg-azul text-white hover:bg-[#04549a]`}
              >
                {item.status_validacao === "pendente" ? "Confirmar" : "Atualizar natureza"}
              </button>
              <button
                type="button"
                onClick={() => setEditando(true)}
                disabled={salvando}
                className={`${BOTAO} border-2 border-azul-escuro text-azul-escuro hover:bg-azul-suave`}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => revisar("rejeitar")}
                disabled={salvando}
                className={`${BOTAO} text-perigo hover:bg-perigo-suave`}
              >
                Rejeitar
              </button>
            </>
          )}
        </div>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-sm text-perigo">
          {erro}
        </p>
      )}
    </li>
  );
}

type ModoPendencia = ResolucaoPendencia["acao"];

function CartaoPendencia({
  pendencia,
  podeInformar,
  podeRevisar,
  aoResolver,
}: {
  pendencia: Pendencia;
  podeInformar: boolean;
  podeRevisar: boolean;
  aoResolver: () => void;
}) {
  const { sessao } = useAuth();
  const [modo, setModo] = useState<ModoPendencia | null>(null);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const aberta = pendencia.status === "aberta";
  const bloqueante = pendencia.severidade === "bloqueante";
  const motivo =
    modo === "informar" && !texto.trim()
      ? "Informe o dado que faltava."
      : modo === "aceitar_com_risco" && !texto.trim()
        ? "Aceitar com risco exige uma justificativa."
        : null;

  async function enviar() {
    if (!modo || motivo) return;
    setSalvando(true);
    setErro(null);
    try {
      await apiJornadas.resolverPendencia(
        sessao!.token,
        pendencia.id,
        modo === "informar" ? { acao: modo, descricao: texto.trim() } : { acao: modo, justificativa: texto.trim() || undefined },
      );
      aoResolver();
    } catch (e: unknown) {
      setErro(mensagem(e, "Não foi possível tratar a pendência. Tente de novo."));
      setSalvando(false);
    }
  }

  return (
    <li
      className={`rounded-lg border-l-4 px-4 py-3 ${
        !aberta ? "border-slate-300 bg-fundo" : bloqueante ? "border-perigo bg-perigo-suave/60" : "border-amber-500 bg-amber-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            bloqueante ? "bg-perigo text-white" : "bg-amber-200 text-amber-900"
          }`}
        >
          {bloqueante ? "Bloqueante" : "Atenção"}
        </span>
        {pendencia.origem_ia && (
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-800">origem: IA</span>
        )}
        {!aberta && <span className="text-xs font-semibold text-cinza">{STATUS_PENDENCIA[pendencia.status]}</span>}
      </div>
      <p className="mt-2 font-semibold text-tinta">{pendencia.descricao}</p>
      {pendencia.pergunta_sugerida && aberta && (
        <p className="mt-1 text-sm text-cinza">Pergunta ao cliente: “{pendencia.pergunta_sugerida}”</p>
      )}
      {pendencia.justificativa && <p className="mt-1 text-sm text-cinza">Justificativa: {pendencia.justificativa}</p>}

      {aberta && podeRevisar && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {podeInformar && (
              <button
                type="button"
                onClick={() => setModo("informar")}
                aria-pressed={modo === "informar"}
                className={`${BOTAO} ${modo === "informar" ? "bg-azul text-white" : "border-2 border-azul-escuro text-azul-escuro hover:bg-azul-suave"}`}
              >
                Informar dado
              </button>
            )}
            <button
              type="button"
              onClick={() => setModo("esclarecido")}
              aria-pressed={modo === "esclarecido"}
              className={`${BOTAO} ${modo === "esclarecido" ? "bg-azul text-white" : "border-2 border-azul-escuro text-azul-escuro hover:bg-azul-suave"}`}
            >
              Esclarecido
            </button>
            <button
              type="button"
              onClick={() => setModo("aceitar_com_risco")}
              aria-pressed={modo === "aceitar_com_risco"}
              className={`${BOTAO} ${modo === "aceitar_com_risco" ? "bg-azul text-white" : "border-2 border-azul-escuro text-azul-escuro hover:bg-azul-suave"}`}
            >
              Aceitar com risco
            </button>
          </div>
          {modo && (
            <>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={2}
                aria-label={modo === "informar" ? "Dado informado" : "Justificativa"}
                placeholder={
                  modo === "informar"
                    ? "O que o cliente informou (vira item acordado, origem manual)."
                    : modo === "aceitar_com_risco"
                      ? "Por que seguir sem este dado (obrigatório)."
                      : "Como foi esclarecido (opcional)."
                }
                className={CAMPO}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={enviar}
                  disabled={!!motivo || salvando}
                  className={`${BOTAO} bg-azul text-white hover:bg-[#04549a]`}
                >
                  {salvando ? "Salvando…" : "Registrar"}
                </button>
                <button
                  type="button"
                  onClick={() => setModo(null)}
                  disabled={salvando}
                  className={`${BOTAO} text-cinza hover:bg-slate-100`}
                >
                  Cancelar
                </button>
                {motivo && <span className="text-sm text-cinza">{motivo}</span>}
              </div>
            </>
          )}
          {erro && (
            <p role="alert" className="text-sm text-perigo">
              {erro}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

interface RevisaoG2Props {
  itens: ItemRevisao[];
  pendencias: Pendencia[];
  secoes: VisaoGeral["secoes"];
  /** Só o analista responsável revisa; os demais veem em leitura (a API recusa igual). */
  podeRevisar: boolean;
  aoMudar: () => void;
}

/** Revisão da ficha extraída pela IA: cada item precisa de decisão de pessoa antes do G2. */
export function RevisaoG2({ itens, pendencias, secoes, podeRevisar, aoMudar }: RevisaoG2Props) {
  const abertas = pendencias.filter((p) => p.status === "aberta");
  const tratadas = pendencias.filter((p) => p.status !== "aberta");
  const porSecao = Object.entries(secoes)
    .map(([chave, s]) => ({ chave, titulo: s.titulo, itens: itens.filter((i) => i.categoria === chave) }))
    .filter((s) => s.itens.length > 0);
  const aRevisar = itens.filter((i) => i.status_validacao === "pendente").length;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)] lg:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold text-azul-escuro">Pendências</h2>
          <span className="text-sm text-cinza">
            {abertas.length} aberta{abertas.length === 1 ? "" : "s"} · {tratadas.length} tratada{tratadas.length === 1 ? "" : "s"}
          </span>
        </div>
        {pendencias.length === 0 ? (
          <p className="mt-3 text-[15px] text-cinza">Nenhuma pendência: todos os obrigatórios estão informados.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {[...abertas, ...tratadas].map((p) => (
              <CartaoPendencia
                key={p.id}
                pendencia={p}
                podeInformar={p.campo in secoes}
                podeRevisar={podeRevisar}
                aoResolver={aoMudar}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)] lg:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold text-azul-escuro">Revisão da ficha</h2>
          <span className="text-sm text-cinza">
            {aRevisar === 0 ? "Todos os itens revisados" : `${aRevisar} de ${itens.length} itens a revisar`}
          </span>
        </div>
        <p className="mt-1 text-sm text-cinza">
          A IA propõe; só você decide. Clique no texto para ver o trecho da transcrição.
        </p>

        {porSecao.length === 0 ? (
          <p className="mt-6 text-[15px] text-cinza">Nenhum item extraído.</p>
        ) : (
          <div className="mt-2 divide-y divide-slate-100">
            {porSecao.map((s) => (
              <div key={s.chave} className="py-3">
                <h3 className="text-sm font-semibold text-cinza">{s.titulo}</h3>
                <ul className="divide-y divide-slate-50">
                  {s.itens.map((item) => (
                    <LinhaRevisao key={item.id} item={item} podeRevisar={podeRevisar} aoSalvar={aoMudar} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
