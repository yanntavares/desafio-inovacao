"use client";

import { useEffect, useRef, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { IconeFechar } from "@/components/icones";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { PacoteHandoff } from "@/lib/tipos";

export type DecisaoG3 = "aceitar" | "devolver";

interface ModalDecisaoGateG3Props {
  decisao: DecisaoG3;
  jornadaId: number;
  pacote: PacoteHandoff;
  aoFechar: () => void;
  /** Chamado depois que a API confirmou; a página recarrega a jornada. */
  aoConcluir: () => void;
}

export function ModalDecisaoGateG3({ decisao, jornadaId, pacote, aoFechar, aoConcluir }: ModalDecisaoGateG3Props) {
  const { sessao } = useAuth();
  const [conferiu, setConferiu] = useState(false);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const primeiroCampo = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const aceitar = decisao === "aceitar";
  const { resumo } = pacote;
  const motivoBloqueio = aceitar
    ? conferiu
      ? null
      : `Marque que conferiu a versão v${pacote.versao} para aceitar.`
    : comentario.trim()
      ? null
      : "Escreva ao analista o que precisa mudar.";

  useEffect(() => {
    primeiroCampo.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && !enviando && aoFechar();
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar, enviando]);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (motivoBloqueio) return;
    setEnviando(true);
    setErro(null);
    try {
      if (aceitar) await apiJornadas.aceitarHandoff(sessao!.token, jornadaId, pacote.versao);
      else await apiJornadas.devolverHandoff(sessao!.token, jornadaId, comentario.trim());
      aoConcluir();
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível registrar a decisão. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-marinho/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !enviando && aoFechar()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-g3"
        onSubmit={confirmar}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl lg:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cinza">Gate G3 · pacote v{pacote.versao}</p>
            <h2 id="titulo-g3" className="mt-1 text-2xl font-bold text-azul-escuro">
              {aceitar ? "Aceitar handoff" : "Devolver ao analista"}
            </h2>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            disabled={enviando}
            aria-label="Fechar"
            className="rounded-lg p-1 text-cinza hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40"
          >
            <IconeFechar className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            [resumo.acordados, "acordados"],
            [resumo.em_discussao, "em discussão"],
            [resumo.bloqueantes, "bloqueantes"],
          ].map(([n, rotulo]) => (
            <div key={rotulo} className="rounded-lg bg-fundo px-3 py-3">
              <dt className="sr-only">{rotulo}</dt>
              <dd className="text-2xl font-bold text-azul-escuro">{n}</dd>
              <dd className="text-xs text-cinza">{rotulo}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-cinza">
          Snapshot <code className="font-mono">{pacote.hash.slice(0, 12)}</code> · {resumo.secoes_preenchidas} de{" "}
          {resumo.secoes_total} seções
        </p>

        {aceitar ? (
          <>
            {resumo.faltam.length > 0 && (
              <p className="mt-4 rounded-lg bg-azul-suave px-4 py-3 text-sm text-azul-escuro">
                Ainda sem informação: {resumo.faltam.join(", ")}.
              </p>
            )}
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-[15px] text-tinta">
              <input
                ref={primeiroCampo}
                type="checkbox"
                checked={conferiu}
                onChange={(e) => setConferiu(e.target.checked)}
                className="mt-1 h-5 w-5 accent-azul"
              />
              <span>
                Conferi o pacote <strong>v{pacote.versao}</strong> e assumo o projeto a partir desta versão. Mudanças
                depois disso só por nova versão.
              </span>
            </label>
          </>
        ) : (
          <label className="mt-5 block">
            <span className="text-sm font-semibold text-tinta">Comentário para o analista (obrigatório)</span>
            <textarea
              ref={primeiroCampo}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
              placeholder="Ex.: faltam prazos e marcos; confirmar com o cliente quem aprova as entregas."
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-[15px] text-tinta focus:border-azul focus:outline-none focus:ring-4 focus:ring-azul/20"
            />
            <span className="mt-1 block text-xs text-cinza">A jornada volta para “Em validação” com este comentário.</span>
          </label>
        )}

        <div className="mt-5">
          <AlertaErro mensagem={erro} />
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={aoFechar}
            disabled={enviando}
            className="h-12 rounded-lg border-2 border-azul-escuro px-6 font-bold text-azul-escuro transition hover:bg-azul-suave disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!!motivoBloqueio || enviando}
            title={motivoBloqueio ?? undefined}
            className={`h-12 rounded-lg px-6 font-bold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
              aceitar
                ? "bg-lima text-azul-escuro hover:brightness-95 focus-visible:ring-lima/50"
                : "bg-azul text-white hover:bg-[#04549a] focus-visible:ring-azul/40"
            }`}
          >
            {enviando ? "Registrando…" : aceitar ? `Aceitar v${pacote.versao}` : "Devolver ao analista"}
          </button>
        </div>
        {motivoBloqueio && <p className="mt-2 text-right text-xs text-cinza">{motivoBloqueio}</p>}
      </form>
    </div>
  );
}
