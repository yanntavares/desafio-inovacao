"use client";

import { useCallback, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type {
  DetalheJornada,
  HistoricoDocumentacao,
  ItemRevisao,
  Pendencia,
  RegistroAuditoria,
  ReuniaoResumo,
  VisaoGeral,
} from "@/lib/tipos";
import { useMigalha } from "@/lib/migalha";
import { useLeitura } from "@/lib/useLeitura";
import { HeaderJornada } from "./HeaderJornada";
import { linhasDocumentos, ListaDocumentos } from "./HistoricoDocumentos";
import { LinhaTempoJornada, ListaReunioes } from "./LinhaTempoJornada";
import { type DecisaoG3, ModalDecisaoGateG3 } from "./ModalDecisaoGateG3";
import { PainelDocumento } from "./PainelDocumento";
import { PainelHandoffGate } from "./PainelHandoffGate";
import { PainelProximoPasso } from "./PainelProximoPasso";
import { PainelValidacaoG2 } from "./PainelValidacaoG2";
import { RevisaoG2 } from "./RevisaoG2";
import { TabelaRequisitosG3 } from "./TabelaRequisitosG3";

interface Dados {
  jornada: DetalheJornada;
  visao: VisaoGeral;
  auditoria: RegistroAuditoria[];
  reunioes: ReuniaoResumo[];
  documentos: HistoricoDocumentacao;
  itens: ItemRevisao[];
  pendencias: Pendencia[];
}

const ABAS = ["Visão geral", "Histórico de documentação", "Reuniões", "Auditoria"] as const;
type Aba = (typeof ABAS)[number];

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)] lg:p-8">
      <h2 className="mb-4 text-2xl font-bold text-azul-escuro">{titulo}</h2>
      {children}
    </section>
  );
}

export function PaginaJornada({ id, documentoInicial = null }: { id: number; documentoInicial?: number | null }) {
  const { sessao } = useAuth();
  const token = sessao!.token;
  const [aba, setAba] = useState<Aba>("Visão geral");
  const [decisao, setDecisao] = useState<DecisaoG3 | null>(null);
  const [documentoAberto, setDocumentoAberto] = useState<number | null>(documentoInicial);

  const carregar = useCallback(async () => {
    const [jornada, visao, auditoria, reunioes, documentos, itens, pendencias] = await Promise.all([
      apiJornadas.detalhe(token, id),
      apiJornadas.visaoGeral(token, id),
      apiJornadas.auditoria(token, id),
      apiJornadas.reunioes(token, id),
      apiJornadas.documentos(token, id),
      apiJornadas.itens(token, id),
      apiJornadas.pendencias(token, id),
    ]);
    return { jornada, visao, auditoria, reunioes, documentos, itens, pendencias };
  }, [token, id]);

  // 5 s enquanto a IA extrai (o worker muda o estado sozinho), 30 s no resto.
  const { dados, erro, recarregar } = useLeitura<Dados>(`lead:${token}:${id}`, carregar, {
    intervaloMs: (d) =>
      d && ["TRANSCRICAO_RECEBIDA", "EXTRAINDO"].includes(d.jornada.estado) ? 5_000 : 30_000,
  });

  useMigalha(dados?.jornada.cliente);

  if (!dados) {
    return erro ? (
      <AlertaErro mensagem={erro} />
    ) : (
      <p role="status" className="py-10 text-center text-sm text-cinza">
        Carregando lead…
      </p>
    );
  }

  const { jornada, visao, auditoria, reunioes, documentos, itens, pendencias } = dados;
  const mascarados = reunioes.reduce((soma, r) => soma + r.dados_mascarados, 0);
  // Em validação a visão geral vira a revisão da ficha (G2); depois, só leitura.
  const emValidacao = jornada.estado === "EM_VALIDACAO";
  const podeRevisar = emValidacao && sessao!.usuario.papel === "comercial" && sessao!.usuario.id === jornada.analista.id;
  const linhasDoc = linhasDocumentos(documentos, {
    jornadaId: jornada.id,
    estado: jornada.estado,
    autor: jornada.analista.nome,
  });
  const aRevisar = itens.filter((i) => i.status_validacao === "pendente").length;
  const abrirDocumento = (documentoId: number) => {
    setDocumentoAberto(documentoId);
    if (aba !== "Visão geral" && aba !== "Histórico de documentação") setAba("Histórico de documentação");
  };
  const painelDocumento = documentoAberto && (
    <PainelDocumento
      documentoId={documentoAberto}
      jornada={jornada}
      aoTrocar={setDocumentoAberto}
      aoFechar={() => setDocumentoAberto(null)}
      aoMudar={recarregar}
    />
  );

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
              {painelDocumento}
              {emValidacao ? (
                <RevisaoG2
                  jornadaId={jornada.id}
                  itens={itens}
                  pendencias={pendencias}
                  secoes={visao.secoes}
                  podeRevisar={podeRevisar}
                  aoMudar={recarregar}
                />
              ) : (
                <TabelaRequisitosG3 visao={visao} />
              )}
              <Cartao titulo="Histórico de documentação">
                <ListaDocumentos linhas={linhasDoc} aoAbrir={abrirDocumento} />
              </Cartao>
            </>
          )}
          {aba === "Histórico de documentação" && (
            <>
              {painelDocumento}
              <Cartao titulo="Histórico de documentação">
                <ListaDocumentos linhas={linhasDoc} aoAbrir={abrirDocumento} />
              </Cartao>
            </>
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
          <PainelProximoPasso
            jornada={jornada}
            documentos={documentos}
            aoAgir={recarregar}
            aoAbrirDocumento={abrirDocumento}
          />
          {emValidacao ? (
            <PainelValidacaoG2 jornada={jornada} aRevisar={aRevisar} aoValidar={recarregar} />
          ) : (
            <PainelHandoffGate jornada={jornada} aoDecidir={setDecisao} aoEnviar={recarregar} />
          )}
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
