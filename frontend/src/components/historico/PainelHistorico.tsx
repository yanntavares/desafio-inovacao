"use client";

import { useEffect, useMemo, useState } from "react";
import { CLASSE_CARTAO } from "@/components/diretoria/estilos";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { paraId, SelecaoFiltro } from "@/components/formulario/SelecaoFiltro";
import { linhasDocumentos, ListaDocumentos } from "@/components/jornada/HistoricoDocumentos";
import { apiJornadas, apiKanban, apiReunioes, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { CardLead, EstadoJornada, HistoricoDocumentacao, UsuarioOpcao } from "@/lib/tipos";

type Visao = "enviadas" | "recebidas";

interface Dados {
  leads: CardLead[];
  documentos: Map<number, HistoricoDocumentacao>;
  gerentes: UsuarioOpcao[];
  /** Momento da carga: referência do filtro de período (render não pode chamar Date.now). */
  agora: number;
}

const PERIODOS = [
  { dias: 7, rotulo: "Últimos 7 dias" },
  { dias: 30, rotulo: "Últimos 30 dias" },
  { dias: 90, rotulo: "Últimos 90 dias" },
  { dias: 0, rotulo: "Todo o período" },
] as const;

const SEM_FILTRO = { analista_id: null, negocio_id: null, so_bloqueantes: false };

/** Leads visíveis (ativos + concluídos) e o histórico de todos numa chamada; a API restringe por papel. */
async function carregar(token: string, visao: Visao): Promise<Dados> {
  const [ativos, concluidos, historico, usuarios] = await Promise.all([
    apiKanban.listar(token, SEM_FILTRO),
    apiKanban.concluidas(token),
    apiJornadas.historico(token),
    visao === "enviadas" ? apiReunioes.usuarios(token) : Promise.resolve([]),
  ]);
  // Só os leads que o histórico devolve (o gerente vê os que recebeu, não a carteira toda).
  const leads = [...ativos.colunas, ...concluidos.colunas].flatMap((c) => c.cards).filter((l) => historico[l.id]);
  return {
    leads,
    documentos: new Map(leads.map((l) => [l.id, historico[l.id]])),
    gerentes: usuarios.filter((u) => u.papel === "gerente"),
    agora: Date.now(),
  };
}

export function PainelHistorico({ visao }: { visao: Visao }) {
  const { sessao } = useAuth();
  const { token, usuario } = sessao!;
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [dias, setDias] = useState<number>(30);
  const [leadId, setLeadId] = useState<number | null>(null);
  const [pessoaId, setPessoaId] = useState<number | null>(null);

  useEffect(() => {
    let ativo = true;
    carregar(token, visao)
      .then((d) => ativo && setDados(d))
      .catch(
        (e: unknown) =>
          ativo && setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar o histórico. Recarregue a página."),
      );
    return () => {
      ativo = false;
    };
  }, [token, visao]);

  const enviadas = visao === "enviadas";

  // Terceiro filtro: o analista filtra pelo gerente que recebeu; o gerente, pelo analista que enviou.
  const pessoas = useMemo(() => {
    if (!dados) return [];
    if (enviadas) return dados.gerentes.map((g) => ({ id: g.id, nome: g.nome }));
    const unicos = new Map(dados.leads.map((l) => [l.analista.id, l.analista.nome]));
    return [...unicos].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [dados, enviadas]);

  const leadsFiltrados = useMemo(() => {
    if (!dados) return [];
    return dados.leads.filter((l) => {
      if (!pessoaId) return true;
      if (!enviadas) return l.analista.id === pessoaId;
      return dados.documentos.get(l.id)?.pacotes.some((p) => p.gerente_id === pessoaId) ?? false;
    });
  }, [dados, pessoaId, enviadas]);

  const linhas = useMemo(() => {
    if (!dados) return [];
    const limite = dias ? dados.agora - dias * 24 * 60 * 60 * 1000 : 0;
    const umLead = leadId !== null;
    const doFiltro = umLead ? leadsFiltrados.filter((l) => l.id === leadId) : leadsFiltrados;
    const todas = doFiltro.flatMap((l) =>
      linhasDocumentos(dados.documentos.get(l.id)!, {
        jornadaId: l.id,
        estado: l.estado as EstadoJornada,
        autor: l.analista.nome,
        cliente: umLead ? undefined : l.cliente,
      }),
    );
    // "Após o aceite" só faz sentido olhando um lead; na visão geral seria uma linha por lead.
    const datadas = todas.filter((l) => l.data && (!limite || new Date(l.data).getTime() >= limite));
    if (umLead) {
      return [...datadas.sort((a, b) => a.data!.localeCompare(b.data!)), ...todas.filter((l) => !l.data)];
    }
    return datadas.sort((a, b) => b.data!.localeCompare(a.data!));
  }, [dados, dias, leadId, leadsFiltrados]);

  const metricas = [
    [
      enviadas ? "Meus leads" : usuario.papel === "gerente" ? "Leads recebidos" : "Todos os leads",
      leadsFiltrados.length,
      "text-azul-escuro",
    ],
    ["Em validação", leadsFiltrados.filter((l) => l.estado === "EM_VALIDACAO").length, "text-azul"],
    ["Handoffs aguardando aceite", leadsFiltrados.filter((l) => l.estado === "HANDOFF_ENVIADO").length, "text-[#9aa81f]"],
    ["Pendências bloqueantes", leadsFiltrados.reduce((s, l) => s + l.bloqueantes, 0), "text-azul/70"],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold text-azul-escuro lg:text-4xl">
        {enviadas ? "Documentações enviadas" : "Documentações recebidas"}
      </h1>

      <div className="flex flex-wrap gap-4">
        <SelecaoFiltro rotulo="Período" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
          {PERIODOS.map((p) => (
            <option key={p.dias} value={p.dias}>
              {p.rotulo}
            </option>
          ))}
        </SelecaoFiltro>
        <SelecaoFiltro
          rotulo="Lead"
          value={leadId ?? ""}
          onChange={(e) => setLeadId(paraId(e.target.value))}
          className="h-12 max-w-72 appearance-none truncate rounded-lg border border-slate-300 bg-white pl-4 pr-11 text-[15px] font-semibold text-tinta outline-none transition focus:border-azul focus:ring-2 focus:ring-azul/30 sm:min-w-56"
        >
          <option value="">Visão Geral</option>
          {leadsFiltrados.map((l) => (
            <option key={l.id} value={l.id}>
              {l.cliente} · {l.titulo}
            </option>
          ))}
        </SelecaoFiltro>
        <SelecaoFiltro
          rotulo={enviadas ? "Gerente" : "Analista"}
          value={pessoaId ?? ""}
          onChange={(e) => {
            setPessoaId(paraId(e.target.value));
            setLeadId(null); // o lead escolhido pode sair da lista filtrada
          }}
        >
          <option value="">{enviadas ? "Todos os gerentes" : "Todos os analistas"}</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </SelecaoFiltro>
      </div>

      <AlertaErro mensagem={erro} />

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricas.map(([rotulo, valor, cor]) => (
          <div key={rotulo} className={`${CLASSE_CARTAO} relative overflow-hidden px-6 py-5`}>
            <span aria-hidden className="absolute inset-y-6 left-0 w-1 rounded-r bg-lima" />
            <dt className="text-[15px] font-semibold text-cinza">{rotulo}</dt>
            <dd className={`mt-2 text-4xl font-bold ${cor}`}>{dados ? valor : "—"}</dd>
          </div>
        ))}
      </dl>

      <hr className="border-slate-200" />

      <section className={`${CLASSE_CARTAO} p-6 lg:px-14 lg:py-10`}>
        <h2 className="mb-8 text-2xl font-bold text-tinta">Histórico de documentação</h2>
        {!dados && !erro ? (
          <p role="status" className="text-sm text-cinza">
            Carregando documentos…
          </p>
        ) : (
          <ListaDocumentos
            linhas={linhas}
            comLink
            vazio={
              enviadas
                ? "Nenhum documento no período. Os documentos aparecem quando você gera resumos ou envia handoffs."
                : "Nenhum documento recebido no período."
            }
          />
        )}
      </section>
    </div>
  );
}
