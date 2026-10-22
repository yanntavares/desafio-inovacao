"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLeitura } from "@/lib/useLeitura";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { IconeCadeado, IconeMais } from "@/components/icones";
import { apiKanban, apiReunioes } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { FiltrosKanban as Filtros, LeadOpcao, RespostaKanban, UsuarioOpcao } from "@/lib/tipos";
import { ColunaKanban } from "./ColunaKanban";
import { FiltrosKanban } from "./FiltrosKanban";

interface QuadroKanbanProps {
  titulo: string;
  subtitulo: string;
  /** Telas 04b: o analista tem o atalho "+ Cadastrar reunião" no topo. */
  comCadastrarReuniao?: boolean;
}

const FILTROS_INICIAIS: Filtros = { analista_id: null, negocio_id: null, so_bloqueantes: false };

export function QuadroKanban({ titulo, subtitulo, comCadastrarReuniao = false }: QuadroKanbanProps) {
  const { sessao } = useAuth();
  // O layout (app) só renderiza a página com sessão; o "!" reflete essa garantia.
  const { token, usuario } = sessao!;
  // Só a visão do analista é restrita; quem barra de fato é a API (_consulta_visivel).
  const ehAnalista = usuario.papel === "comercial";

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [analistas, setAnalistas] = useState<UsuarioOpcao[]>([]);
  const [negocios, setNegocios] = useState<LeadOpcao[]>([]);

  // Opções dos filtros: uma vez por sessão. Falha aqui não impede ver o quadro.
  useEffect(() => {
    let ativo = true;
    apiReunioes
      .opcoes(token)
      .then((o) => ativo && setNegocios(o.leads))
      .catch(() => {});
    if (!ehAnalista) {
      apiReunioes
        .usuarios(token)
        .then((us) => ativo && setAnalistas(us.filter((u) => u.papel === "comercial")))
        .catch(() => {});
    }
    return () => {
      ativo = false;
    };
  }, [token, ehAnalista]);

  // 5 s enquanto algum card está "Extraindo…" (o worker muda a coluna sozinho), 30 s no resto.
  const { dados: quadro, erro: falha, atualizadoEm } = useLeitura<RespostaKanban>(
    `kanban:${token}:${JSON.stringify(filtros)}`,
    () => apiKanban.listar(token, filtros),
    { intervaloMs: (d) => (d?.colunas.some((c) => c.cards.some((card) => card.extraindo)) ? 5_000 : 30_000) },
  );
  const erro = falha && !quadro ? falha : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-azul-escuro lg:text-4xl">{titulo}</h1>
          <p className="mt-2 text-[17px] text-cinza">{subtitulo}</p>
        </div>
        {comCadastrarReuniao && (
          <Link
            href="/reunioes/cadastrar"
            className="inline-flex h-14 items-center gap-2 rounded-lg bg-azul px-8 text-lg font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40"
          >
            <IconeMais className="h-5 w-5" />
            Cadastrar reunião
          </Link>
        )}
      </div>

      {quadro && (
        <p className="flex items-center gap-3 rounded-xl bg-lima-suave px-5 py-4 text-[15px] font-semibold text-azul-escuro">
          <IconeCadeado className="h-5 w-5 shrink-0" />
          {quadro.aviso}
        </p>
      )}

      <FiltrosKanban
        filtros={filtros}
        aoMudar={setFiltros}
        analistas={ehAnalista ? null : analistas}
        negocios={negocios}
      />

      <AlertaErro mensagem={erro} />

      {!quadro && !erro ? (
        <p role="status" className="py-10 text-center text-sm text-cinza">
          Carregando leads…
        </p>
      ) : (
        quadro && (
          <div className="-mx-6 overflow-x-auto px-6 pb-2 lg:-mx-8 lg:px-8 xl:mx-0 xl:overflow-visible xl:px-0">
            <div className="flex min-h-[60vh] gap-3 xl:grid xl:grid-cols-6">
              {quadro.colunas.map((coluna) => (
                <ColunaKanban key={coluna.etapa} coluna={coluna} />
              ))}
            </div>
          </div>
        )
      )}

      <p className="text-xs text-cinza">
        Etapas = estados da jornada. Jornadas concluídas ficam no histórico.
        {atualizadoEm && ` Atualizado às ${atualizadoEm.toLocaleTimeString("pt-BR")}.`}
      </p>
    </div>
  );
}
