import { formatarData, formatarDataHora } from "@/lib/formato";
import type { RegistroAuditoria, ReuniaoResumo, TipoReuniao } from "@/lib/tipos";

const ESTADO_LEGIVEL: Record<string, string> = {
  CRIADA: "Criada",
  TRANSCRICAO_RECEBIDA: "Transcrição recebida",
  EXTRAINDO: "Extraindo",
  FALHA_EXTRACAO: "Falha na extração",
  EM_VALIDACAO: "Em validação",
  VALIDADA: "Validada",
  HANDOFF_ENVIADO: "Handoff enviado",
  ACEITO: "Aceito",
  BRIEFING_APROVADO: "Briefing aprovado",
  CONCLUIDA: "Concluída",
};

const ACAO: Record<string, string> = {
  cadastrar_lead: "Cadastrou o lead",
  cadastrar_reuniao: "Cadastrou reunião",
  extracao_concluida: "Extração concluída",
  adicionar_item: "Incluiu item",
  confirmar_item: "Confirmou item",
  editar_item: "Editou item",
  rejeitar_item: "Rejeitou item",
  criar_pendencia: "Abriu pendência",
  resolver_pendencia: "Resolveu pendência",
  reabrir_pendencia: "Reabriu pendência",
  gerar_documento: "Gerou documento",
  editar_documento: "Editou documento",
  nova_versao_documento: "Criou nova versão de documento",
  aprovar_documento: "Aprovou documento",
  devolver_handoff: "Devolveu o handoff ao analista",
};

/** Texto da linha do tempo a partir do registro de auditoria (ação + antes/depois). */
export function descreverEvento(r: RegistroAuditoria): string {
  const depois = r.depois ?? {};
  const versao = typeof depois.versao === "number" ? ` v${depois.versao}` : "";
  switch (r.acao) {
    case "mudar_estado": {
      const estado = String(depois.estado ?? "");
      if (estado === "VALIDADA") return "Aprovou a validação (G2)";
      if (estado === "BRIEFING_APROVADO") return "Aprovou o briefing (G4)";
      return `Jornada passou para ${ESTADO_LEGIVEL[estado] ?? estado}`;
    }
    case "enviar_handoff":
      return `Enviou handoff${versao}`;
    case "aceitar_handoff":
      return `Aceitou handoff${versao} (G3)`;
    case "acao_recusada":
      return `Ação recusada: ${String(depois.mensagem ?? "sem permissão")}`;
    default:
      return ACAO[r.acao] ?? r.acao.replaceAll("_", " ");
  }
}

interface LinhaTempoJornadaProps {
  registros: RegistroAuditoria[];
  /** Painel lateral mostra só os mais recentes; a aba "Auditoria" mostra tudo. */
  limite?: number;
  /** Na aba "Auditoria": hora e mensagem de recusa ficam visíveis. */
  detalhado?: boolean;
}

export function LinhaTempoJornada({ registros, limite, detalhado = false }: LinhaTempoJornadaProps) {
  // Transições de estado repetem a ação que as causou; fora da auditoria completa, só a ação aparece.
  const relevantes = detalhado
    ? registros
    : registros.filter(
        (r) => r.acao !== "acao_recusada" && !(r.acao === "mudar_estado" && !["VALIDADA", "BRIEFING_APROVADO"].includes(String(r.depois?.estado))),
      );
  const visiveis = limite ? relevantes.slice(0, limite) : relevantes;

  if (visiveis.length === 0) return <p className="text-sm text-cinza">Nenhum evento registrado ainda.</p>;

  return (
    <ol className="relative">
      {visiveis.map((r, i) => (
        <li key={r.id} className="relative flex gap-4 pb-5 last:pb-0">
          {i < visiveis.length - 1 && <span aria-hidden className="absolute top-4 left-[7px] h-full w-0.5 bg-slate-200" />}
          <span
            aria-hidden
            className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-azul ${i === 0 ? "bg-azul" : "bg-white"}`}
          />
          <div className="min-w-0">
            <p className="text-sm text-cinza">
              {detalhado ? formatarDataHora(r.quando) : formatarData(r.quando, false)} · {r.autor}
            </p>
            <p className={`font-semibold ${r.acao === "acao_recusada" ? "text-perigo" : "text-tinta"}`}>{descreverEvento(r)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const TIPO_REUNIAO: Record<TipoReuniao, string> = {
  exploratoria: "Exploratória",
  aprofundamento: "Aprofundamento",
  alinhamento: "Alinhamento",
  fechamento: "Fechamento",
};

/** Aba "Reuniões": transcrições recebidas, com o que foi mascarado antes de ir à IA. */
export function ListaReunioes({ reunioes }: { reunioes: ReuniaoResumo[] }) {
  if (reunioes.length === 0) return <p className="text-sm text-cinza">Nenhuma reunião cadastrada.</p>;
  return (
    <ul className="flex flex-col divide-y divide-slate-100">
      {reunioes.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="font-bold text-tinta">{r.titulo}</p>
            <p className="mt-1 text-sm text-cinza">
              {r.data_reuniao ? formatarData(r.data_reuniao) : "Sem data"} · {TIPO_REUNIAO[r.tipo] ?? r.tipo} ·{" "}
              {r.participantes.map((p) => p.nome).join(", ") || "sem participantes"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-tinta">{r.palavras} palavras</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-tinta">{r.segmentos} segmentos</span>
            {r.dados_mascarados > 0 && (
              <span className="rounded-full bg-lima-suave px-2.5 py-1 text-azul-escuro">{r.dados_mascarados} mascarados</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
