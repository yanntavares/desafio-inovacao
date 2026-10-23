"use client";

import { useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { DetalheJornada } from "@/lib/tipos";

interface PainelValidacaoG2Props {
  jornada: DetalheJornada;
  /** Itens ainda sem decisão de pessoa. */
  aRevisar: number;
  aoValidar: () => void;
}

/** G2: o analista confirma a documentação e libera o envio do handoff ao gerente. */
export function PainelValidacaoG2({ jornada, aRevisar, aoValidar }: PainelValidacaoG2Props) {
  const { sessao } = useAuth();
  const { usuario } = sessao!;
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const g2 = jornada.gates.G2;
  const ehResponsavel = usuario.papel === "comercial" && usuario.id === jornada.analista.id;
  const { completude, bloqueantes } = jornada;

  async function validar() {
    setEnviando(true);
    setErro(null);
    try {
      await apiJornadas.validar(sessao!.token, jornada.id);
      aoValidar();
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível confirmar a documentação. Tente de novo.");
      setEnviando(false);
      setConfirmando(false);
    }
  }

  return (
    <section className="rounded-xl border-2 border-azul bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)]">
      <h2 className="text-2xl font-bold text-azul-escuro">Validação da ficha</h2>
      <p className="mt-1 text-[15px] text-cinza">Gate G2 · decidido pelo analista responsável</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {(
          [
            [aRevisar, "a revisar", aRevisar > 0 ? "text-amber-700" : "text-emerald-700"],
            [bloqueantes, "bloqueantes", bloqueantes > 0 ? "text-perigo" : "text-emerald-700"],
            [`${completude.preenchidas}/${completude.total}`, "seções", "text-azul-escuro"],
          ] as const
        ).map(([n, rotulo, cor]) => (
          <div key={rotulo} className="rounded-lg bg-fundo px-3 py-3">
            <p className={`text-2xl font-bold ${cor}`}>{n}</p>
            <p className="text-sm text-cinza">{rotulo}</p>
          </div>
        ))}
      </div>

      {ehResponsavel ? (
        <div className="mt-5 flex flex-col gap-3">
          <AlertaErro mensagem={erro} />
          {confirmando ? (
            <div className="rounded-lg bg-lima-suave px-4 py-4 text-[15px] text-azul-escuro">
              <p className="font-bold">Confirmar a documentação deste lead?</p>
              <p className="mt-1">
                A ficha fica validada e os itens deixam de ser editáveis. Em seguida você envia o handoff ao gerente.
                {aRevisar > 0 &&
                  ` ${aRevisar} ${aRevisar === 1 ? "item ainda não revisado vai" : "itens ainda não revisados vão"} ao pacote como “Sugestão da IA”.`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={validar}
                  disabled={enviando}
                  className="h-11 rounded-lg bg-azul px-5 font-bold text-white transition hover:bg-[#04549a] disabled:opacity-60"
                >
                  {enviando ? "Confirmando…" : "Sim, confirmar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  disabled={enviando}
                  className="h-11 rounded-lg px-5 font-bold text-azul-escuro hover:bg-white/60"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              disabled={!g2.liberado}
              className="h-14 rounded-lg bg-lima text-lg font-bold text-azul-escuro transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lima/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmar documentação (G2)
            </button>
          )}
          {!g2.liberado && g2.motivo && (
            <p className="text-sm text-cinza">
              {g2.motivo} {bloqueantes > 0 && "Trate as pendências bloqueantes (informar, esclarecido ou aceitar com risco)."}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-azul-suave px-4 py-3 text-[15px] font-semibold text-azul-escuro">
          Aguardando a validação de {jornada.analista.nome} (G2).
        </p>
      )}
    </section>
  );
}
