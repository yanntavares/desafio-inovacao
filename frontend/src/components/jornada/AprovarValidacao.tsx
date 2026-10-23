"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { DetalheJornada } from "@/lib/tipos";

/**
 * Gate G2: "Aprovar validação". Desabilitado com o motivo escrito (o da API, em jornada.gates.G2);
 * a API recusa a ação mesmo assim. Só o analista (comercial) vê o botão.
 */
export function AprovarValidacao({ jornada }: { jornada: DetalheJornada }) {
  const { sessao } = useAuth();
  const { token, usuario } = sessao!;
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (usuario.papel !== "comercial" || jornada.estado !== "EM_VALIDACAO") return null;
  const g2 = jornada.gates.G2;

  async function aprovar() {
    setOcupado(true);
    setErro(null);
    try {
      await apiJornadas.aprovarValidacao(token, jornada.id);
      router.push(`/jornadas/${jornada.id}`); // próximo passo: enviar o handoff ao gerente
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível aprovar a validação. Tente de novo.");
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={!g2.liberado || ocupado}
        onClick={aprovar}
        className="h-14 rounded-lg bg-lima px-6 text-lg font-bold text-azul-escuro transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lima/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ocupado ? "Aprovando…" : "Aprovar validação"}
      </button>
      {!g2.liberado && g2.motivo && (
        <p className="text-sm text-cinza">
          {g2.motivo}{" "}
          {jornada.bloqueantes > 0 && (
            <Link href={`/jornadas/${jornada.id}/revisao#pendencias`} className="font-semibold text-azul underline">
              Ver pendências
            </Link>
          )}
        </p>
      )}
      <AlertaErro mensagem={erro} />
    </div>
  );
}
