"use client";

import { useCallback, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatarData } from "@/lib/formato";
import type {
  DetalheJornada,
  HistoricoDocumentacao,
  RegistroAuditoria,
  ReuniaoResumo,
  VisaoGeral,
} from "@/lib/tipos";
import { useLeitura } from "@/lib/useLeitura";
import { HeaderJornada } from "./HeaderJornada";
import { LinhaTempoJornada, ListaReunioes } from "./LinhaTempoJornada";
import { type DecisaoG3, ModalDecisaoGateG3 } from "./ModalDecisaoGateG3";
import { PainelHandoffGate } from "./PainelHandoffGate";
import { PainelProximoPasso } from "./PainelProximoPasso";
import { TabelaRequisitosG3 } from "./TabelaRequisitosG3";

interface Dados {
  jornada: DetalheJornada;
  visao: VisaoGeral;
  auditoria: RegistroAuditoria[];
  reunioes: ReuniaoResumo[];
  documentos: HistoricoDocumentacao;
}

const ABAS = ["Visão geral", "Histórico de documentação", "Reuniões", "Auditoria"] as const;
type Aba = (typeof ABAS)[number];

const TIPO_DOCUMENTO: Record<string, string> = {
  resumo_comercial: "Resumo comercial",
  briefing_comercial: "Briefing comercial",
  resumo_gerencial: "Resumo gerencial",
  briefing_projeto: "Briefing de projeto",
  pauta_kickoff: "Pauta de kickoff",
};

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)] lg:p-8">
      <h2 className="mb-4 text-2xl font-bold text-azul-escuro">{titulo}</h2>
      {children}
    </section>
  );
}

function Selo({ tom, children }: { tom: "verde" | "azul" | "cinza"; children: React.ReactNode }) {
  const cores = {
    verde: "bg-emerald-50 text-emerald-800",
    azul: "bg-azul-suave text-azul",
    cinza: "bg-slate-100 text-tinta",
  }[tom];
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${cores}`}>{children}</span>;
}

function HistoricoDocumentos({ historico, estado }: { historico: HistoricoDocumentacao; estado: DetalheJornada["estado"] }) {
  const ultimoPacote = historico.pacotes.at(-1);
  const linhas = [
    ...historico.documentos.map((d) => ({
      chave: `d${d.id}`,
      titulo: TIPO_DOCUMENTO[d.tipo] ?? d.tipo,
      sub: formatarData(d.criado_em, false),
      versao: `v${d.versao}`,
      selo: d.status === "aprovado" ? <Selo tom="verde">Aprovado</Selo> : <Selo tom="cinza">Rascunho</Selo>,
    })),
    ...historico.pacotes.map((p) => ({
      chave: `p${p.id}`,
      titulo: "Pacote de handoff",
      sub: `${p.enviado_em ? formatarData(p.enviado_em, false) : "—"} · snapshot ${p.hash.slice(0, 6)}…`,
      versao: `v${p.versao}`,
      selo:
        p !== ultimoPacote ? (
          <Selo tom="cinza">Substituído</Selo>
        ) : estado === "HANDOFF_ENVIADO" ? (
          <Selo tom="azul">Aguardando aceite</Selo>
        ) : ["ACEITO", "BRIEFING_APROVADO", "CONCLUIDA"].includes(estado) ? (
          <Selo tom="verde">Aceito</Selo>
        ) : (
          <Selo tom="cinza">Devolvido</Selo>
        ),
    })),
    ...historico.apos_o_aceite.map((tipo) => ({
      chave: `a${tipo}`,
      titulo: TIPO_DOCUMENTO[tipo] ?? tipo,
      sub: "Gerado a partir do pacote aceito",
      versao: "—",
      selo: <Selo tom="cinza">Após o aceite</Selo>,
    })),
  ];

  if (linhas.length === 0) return <p className="text-sm text-cinza">Nenhum documento gerado ainda.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {linhas.map((l) => (
        <li key={l.chave} className="flex items-center gap-4">
          <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-azul-suave text-azul">
            ≡
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-tinta">{l.titulo}</p>
            <p className="truncate text-sm text-cinza">{l.sub}</p>
          </div>
          <span className="hidden w-12 rounded-full bg-slate-100 py-1 text-center text-xs font-semibold text-tinta sm:block">
            {l.versao}
          </span>
          <div className="flex w-36 justify-end">{l.selo}</div>
        </li>
      ))}
    </ul>
  );
}

export function PaginaJornada({ id }: { id: number }) {
  const { sessao } = useAuth();
  const token = sessao!.token;
  const [aba, setAba] = useState<Aba>("Visão geral");
  const [decisao, setDecisao] = useState<DecisaoG3 | null>(null);

  const carregar = useCallback(async () => {
    const [jornada, visao, auditoria, reunioes, documentos] = await Promise.all([
      apiJornadas.detalhe(token, id),
      apiJornadas.visaoGeral(token, id),
      apiJornadas.auditoria(token, id),
      apiJornadas.reunioes(token, id),
      apiJornadas.documentos(token, id),
    ]);
    return { jornada, visao, auditoria, reunioes, documentos };
  }, [token, id]);

  // 5 s enquanto a IA extrai (o worker muda o estado sozinho), 30 s no resto.
  const { dados, erro, recarregar } = useLeitura<Dados>(`lead:${token}:${id}`, carregar, {
    intervaloMs: (d) =>
      d && ["TRANSCRICAO_RECEBIDA", "EXTRAINDO"].includes(d.jornada.estado) ? 5_000 : 30_000,
  });

  if (!dados) {
    return erro ? (
      <AlertaErro mensagem={erro} />
    ) : (
      <p role="status" className="py-10 text-center text-sm text-cinza">
        Carregando lead…
      </p>
    );
  }

  const { jornada, visao, auditoria, reunioes, documentos } = dados;
  const mascarados = reunioes.reduce((soma, r) => soma + r.dados_mascarados, 0);

  return (
    <div className="flex flex-col gap-6">
      <HeaderJornada jornada={jornada} dadosMascarados={mascarados} />
      <AlertaErro mensagem={erro} />

      <div role="tablist" aria-label="Seções do lead" className="flex gap-6 overflow-x-auto border-b border-slate-200">
        {ABAS.map((a) => (
          <button
            key={a}
            role="tab"
            type="button"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={`-mb-px shrink-0 border-b-[3px] px-2 pb-3 text-[17px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 ${
              aba === a ? "border-azul text-azul" : "border-transparent text-cinza hover:text-tinta"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div role="tabpanel" aria-label={aba} className="flex min-w-0 flex-col gap-6">
          {aba === "Visão geral" && (
            <>
              <TabelaRequisitosG3 visao={visao} />
              <Cartao titulo="Histórico de documentação">
                <HistoricoDocumentos historico={documentos} estado={jornada.estado} />
              </Cartao>
            </>
          )}
          {aba === "Histórico de documentação" && (
            <Cartao titulo="Histórico de documentação">
              <HistoricoDocumentos historico={documentos} estado={jornada.estado} />
            </Cartao>
          )}
          {aba === "Reuniões" && (
            <Cartao titulo="Reuniões">
              <ListaReunioes reunioes={reunioes} />
            </Cartao>
          )}
          {aba === "Auditoria" && (
            <Cartao titulo="Auditoria">
              <LinhaTempoJornada registros={auditoria} detalhado />
            </Cartao>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <PainelProximoPasso jornada={jornada} aoAgir={recarregar} />
          <PainelHandoffGate jornada={jornada} aoDecidir={setDecisao} aoEnviar={recarregar} />
          <Cartao titulo="Linha do tempo">
            <LinhaTempoJornada registros={auditoria} limite={5} />
          </Cartao>
        </aside>
      </div>

      {decisao && jornada.handoff && (
        <ModalDecisaoGateG3
          decisao={decisao}
          jornadaId={jornada.id}
          pacote={jornada.handoff}
          aoFechar={() => setDecisao(null)}
          aoConcluir={() => {
            setDecisao(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}
