"use client";

import { useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { DetalheJornada } from "@/lib/tipos";

interface PainelProximoPassoProps {
  jornada: DetalheJornada;
  /** Recarrega o lead depois de uma ação. */
  aoAgir: () => void;
}

/** O que a pessoa pode fazer agora no lead, conforme o estado da jornada (faixa "próxima ação" das user stories). */
export function PainelProximoPasso({ jornada, aoAgir }: PainelProximoPassoProps) {
  const { sessao } = useAuth();
  const { token, usuario } = sessao!;
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function agir(acao: () => Promise<unknown>, falha: string) {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
      aoAgir();
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : falha);
    } finally {
      setOcupado(false);
    }
  }

  // Quem cadastra reunião (analista dono ou gerente) também pede nova tentativa; a API confere o resto.
  const podeTentarDeNovo =
    usuario.papel === "gerente" || (usuario.papel === "comercial" && usuario.id === jornada.analista.id);

  let titulo: string;
  let corpo: React.ReactNode;
  switch (jornada.estado) {
    case "TRANSCRICAO_RECEBIDA":
    case "EXTRAINDO":
      titulo = "Extraindo a ficha";
      corpo = (
        <p role="status" className="text-[15px] text-cinza">
          A IA está organizando a transcrição em segundo plano. Esta página se atualiza sozinha e você pode fechá-la: ao
          terminar, o lead vai para Em validação.
        </p>
      );
      break;
    case "FALHA_EXTRACAO":
      titulo = "A extração falhou";
      corpo = (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-cinza">Não foi possível extrair. Sua transcrição está preservada.</p>
          <button
            type="button"
            disabled={!podeTentarDeNovo || ocupado}
            onClick={() => agir(() => apiJornadas.tentarExtracaoDeNovo(token, jornada.id), "Não foi possível tentar de novo. Tente outra vez.")}
            className="h-14 rounded-lg bg-azul text-lg font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ocupado ? "Enviando…" : "Tentar de novo"}
          </button>
          {!podeTentarDeNovo && (
            <p className="text-sm text-cinza">Só o analista responsável ou o gerente pedem uma nova tentativa.</p>
          )}
        </div>
      );
      break;
    default:
      return null;
  }

  return (
    <section className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)]">
      <h2 className="text-2xl font-bold text-azul-escuro">{titulo}</h2>
      <div className="mt-3 flex flex-col gap-3">
        {corpo}
        <AlertaErro mensagem={erro} />
      </div>
    </section>
  );
}
