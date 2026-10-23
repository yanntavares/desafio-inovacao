"use client";

import { useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { AcaoPendencia, PendenciaItem } from "@/lib/tipos";

const STATUS: Record<PendenciaItem["status"], { rotulo: string; classe: string }> = {
  aberta: { rotulo: "Aberta", classe: "bg-slate-100 text-tinta" },
  resolvida: { rotulo: "Informada", classe: "bg-emerald-50 text-emerald-800" },
  esclarecida: { rotulo: "Esclarecida", classe: "bg-sky-50 text-azul-escuro" },
  aceita_com_risco: { rotulo: "Aceita com risco", classe: "bg-amber-50 text-amber-800" },
};

const ACOES: { valor: AcaoPendencia; rotulo: string; campo: string; obrigatorio: boolean; dica: string }[] = [
  { valor: "informar", rotulo: "Informar", campo: "Dado que faltava", obrigatorio: true, dica: "Vira um item da ficha, confirmado por você." },
  { valor: "esclarecido", rotulo: "Esclarecido com o cliente", campo: "Observação (opcional)", obrigatorio: false, dica: "O cliente já respondeu fora da reunião." },
  { valor: "aceitar_com_risco", rotulo: "Aceitar com risco", campo: "Justificativa", obrigatorio: true, dica: "Segue sem o dado; o gerente vê o risco e a justificativa." },
];

function CartaoPendencia({
  pendencia,
  titulo,
  motivoSemAcao,
  aoResolver,
}: {
  pendencia: PendenciaItem;
  titulo: string;
  motivoSemAcao: string | null;
  aoResolver: () => void;
}) {
  const { sessao } = useAuth();
  const token = sessao!.token;
  const [acao, setAcao] = useState<AcaoPendencia | null>(null);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const aberta = pendencia.status === "aberta";
  const bloqueante = pendencia.severidade === "bloqueante";
  const escolhida = ACOES.find((a) => a.valor === acao);
  const faltaTexto = !!escolhida?.obrigatorio && texto.trim().length === 0;

  async function resolver() {
    if (!acao) return;
    setOcupado(true);
    setErro(null);
    try {
      await apiJornadas.resolverPendencia(token, pendencia.id, {
        acao,
        descricao: acao === "informar" ? texto : undefined,
        justificativa: acao === "informar" ? undefined : texto || undefined,
      });
      setAcao(null);
      setTexto("");
      aoResolver();
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível tratar a pendência. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <li
      aria-label={`Pendência: ${titulo}`}
      className={`rounded-xl border-2 bg-white p-4 shadow-sm ${aberta && bloqueante ? "border-lima" : "border-slate-300"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${bloqueante ? "bg-lima text-azul-escuro" : "bg-slate-100 text-tinta"}`}>
          {bloqueante ? "Bloqueante" : "Atenção"}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[pendencia.status].classe}`}>{STATUS[pendencia.status].rotulo}</span>
        {pendencia.origem_ia && (
          <span title="Lacuna apontada pela IA" className="rounded-full border border-dashed border-slate-400 px-3 py-1 text-xs font-semibold text-cinza">
            Origem: IA
          </span>
        )}
        <span className="text-sm font-semibold text-azul-escuro">{titulo}</span>
      </div>
      <p className="mt-2 text-[15px] text-tinta">{pendencia.descricao}</p>
      {pendencia.pergunta_sugerida && (
        <p className="mt-1 text-sm text-cinza">
          Pergunta sugerida ao cliente: <em>{pendencia.pergunta_sugerida}</em>
        </p>
      )}
      {!aberta && pendencia.justificativa && (
        <p className="mt-2 text-sm text-cinza">
          Justificativa: <span className="text-tinta">{pendencia.justificativa}</span>
        </p>
      )}

      {aberta &&
        (motivoSemAcao ? (
          <p className="mt-3 rounded-lg bg-slate-100 px-4 py-3 text-sm text-tinta">{motivoSemAcao}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {ACOES.map((a) => (
                <button
                  key={a.valor}
                  type="button"
                  aria-pressed={acao === a.valor}
                  title={a.dica}
                  onClick={() => {
                    setAcao(a.valor);
                    setErro(null);
                  }}
                  className={`h-10 rounded-lg border-2 px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30 ${
                    acao === a.valor ? "border-azul bg-azul text-white" : "border-azul text-azul hover:bg-azul-suave"
                  }`}
                >
                  {a.rotulo}
                </button>
              ))}
            </div>
            {escolhida && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-tinta">
                  {escolhida.campo}
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={2}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] font-normal outline-none focus:border-azul focus:ring-2 focus:ring-azul/30"
                  />
                </label>
                <AlertaErro mensagem={erro} />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={faltaTexto || ocupado}
                    onClick={resolver}
                    className="h-10 rounded-lg bg-azul px-5 text-sm font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {ocupado ? "Salvando…" : "Confirmar"}
                  </button>
                  {faltaTexto && <span className="text-sm text-cinza">{escolhida.campo} é obrigatório.</span>}
                </div>
              </div>
            )}
          </div>
        ))}
    </li>
  );
}

interface ListaPendenciasProps {
  pendencias: PendenciaItem[];
  /** Título da seção por categoria (campo da pendência). */
  titulos: Record<string, string>;
  motivoSemAcao: string | null;
  aoResolver: () => void;
}

export function ListaPendencias({ pendencias, titulos, motivoSemAcao, aoResolver }: ListaPendenciasProps) {
  const abertas = pendencias.filter((p) => p.status === "aberta");
  const bloqueantes = abertas.filter((p) => p.severidade === "bloqueante").length;
  // abertas primeiro, bloqueantes antes das de atenção
  const ordenadas = [...pendencias].sort(
    (a, b) =>
      Number(b.status === "aberta") - Number(a.status === "aberta") ||
      Number(b.severidade === "bloqueante") - Number(a.severidade === "bloqueante") ||
      a.id - b.id,
  );

  return (
    <section id="pendencias" aria-label="Pendências" className="scroll-mt-24">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-cinza">
        Pendências · {abertas.length} aberta(s){bloqueantes > 0 ? `, ${bloqueantes} bloqueante(s)` : ""}
      </h2>
      {pendencias.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center text-cinza">
          Nenhuma pendência: todos os campos obrigatórios estão informados.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ordenadas.map((p) => (
            <CartaoPendencia key={p.id} pendencia={p} titulo={titulos[p.campo] ?? p.campo} motivoSemAcao={motivoSemAcao} aoResolver={aoResolver} />
          ))}
        </ul>
      )}
    </section>
  );
}
