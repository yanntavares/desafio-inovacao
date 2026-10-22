"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { paraId, SelecaoFiltro } from "@/components/formulario/SelecaoFiltro";
import { apiKanban, apiReunioes } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { CardLead, UsuarioOpcao } from "@/lib/tipos";
import { useLeitura } from "@/lib/useLeitura";

const SEM_FILTRO = { analista_id: null, negocio_id: null, so_bloqueantes: false };

export function TabelaHistorico() {
  const { sessao } = useAuth();
  const { token, usuario } = sessao!; // o layout (app) só renderiza a página com sessão
  // Só quem vê todos os leads filtra por analista; para o analista a API já restringe à carteira dele.
  const ehAnalista = usuario.papel === "comercial";
  const [analistaId, setAnalistaId] = useState<number | null>(null);
  const [analistas, setAnalistas] = useState<UsuarioOpcao[]>([]);

  useEffect(() => {
    if (ehAnalista) return;
    let ativo = true;
    apiReunioes
      .usuarios(token)
      .then((us) => ativo && setAnalistas(us.filter((u) => u.papel === "comercial")))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [token, ehAnalista]);

  const { dados, erro, atualizadoEm } = useLeitura(
    `historico:${token}:${analistaId}`,
    () => apiKanban.listar(token, { ...SEM_FILTRO, analista_id: analistaId }, true),
    { intervaloMs: 60_000 },
  );
  const leads: CardLead[] = dados?.colunas.flatMap((c) => c.cards) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-azul-escuro lg:text-4xl">Histórico</h1>
        <p className="mt-2 text-[17px] text-cinza">
          Jornadas concluídas: o kickoff foi realizado e a pauta aprovada. Os documentos continuam consultáveis.
        </p>
      </div>

      {!ehAnalista && (
        <div className="flex">
          <SelecaoFiltro
            rotulo="Filtrar por analista"
            value={analistaId ?? ""}
            onChange={(e) => setAnalistaId(paraId(e.target.value))}
          >
            <option value="">Todos os analistas</option>
            {analistas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </SelecaoFiltro>
        </div>
      )}

      <AlertaErro mensagem={dados ? null : erro} />

      {!dados && !erro ? (
        <p role="status" className="py-10 text-center text-sm text-cinza">
          Carregando histórico…
        </p>
      ) : (
        dados && (
          <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
            {leads.length === 0 ? (
              <p className="px-6 py-12 text-center text-cinza">
                Nenhuma jornada concluída ainda. Quando o gerente concluir o kickoff de um lead, ele aparece aqui.
              </p>
            ) : (
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-fundo text-sm text-cinza">
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Lead
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Analista
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Reuniões
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Completude
                    </th>
                    <th scope="col" className="px-6 py-3">
                      <span className="sr-only">Abrir</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 last:border-0 hover:bg-azul-suave/50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/jornadas/${lead.id}`}
                          className="font-bold text-tinta hover:text-azul hover:underline focus-visible:outline-2 focus-visible:outline-azul"
                        >
                          {lead.cliente}
                        </Link>
                        <p className="text-sm text-cinza">{lead.titulo}</p>
                      </td>
                      <td className="px-4 py-4 text-tinta">
                        <span className="inline-flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-azul-suave text-[11px] font-bold text-azul-escuro">
                            {lead.analista.iniciais}
                          </span>
                          {lead.analista.nome}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-tinta">{lead.reunioes}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-3">
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                            <span className="block h-full rounded-full bg-emerald-700" style={{ width: `${lead.completude}%` }} />
                          </span>
                          <span className="text-sm font-semibold text-tinta">{lead.completude}%</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/jornadas/${lead.id}`}
                          className="inline-flex h-10 items-center rounded-lg border border-azul px-4 text-sm font-bold text-azul transition hover:bg-azul hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30"
                        >
                          Abrir lead
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      )}

      {atualizadoEm && <p className="text-xs text-cinza">Atualizado às {atualizadoEm.toLocaleTimeString("pt-BR")}.</p>}
    </div>
  );
}
