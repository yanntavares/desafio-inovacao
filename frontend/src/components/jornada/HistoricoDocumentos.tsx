import Link from "next/link";
import { formatarData } from "@/lib/formato";
import type { EstadoJornada, HistoricoDocumentacao } from "@/lib/tipos";

export const TIPO_DOCUMENTO: Record<string, string> = {
  resumo_comercial: "Resumo comercial",
  briefing_comercial: "Briefing comercial",
  resumo_gerencial: "Resumo gerencial",
  briefing_projeto: "Briefing de projeto",
  pauta_kickoff: "Pauta de kickoff",
};

const DEPOIS_DO_ACEITE: EstadoJornada[] = ["ACEITO", "BRIEFING_APROVADO", "CONCLUIDA"];

type Tom = "verde" | "azul" | "cinza";

const COR_SELO: Record<Tom, { fundo: string; ponto: string }> = {
  verde: { fundo: "bg-emerald-50 text-emerald-800", ponto: "bg-emerald-700" },
  azul: { fundo: "bg-azul-suave text-azul", ponto: "bg-azul" },
  cinza: { fundo: "bg-slate-100 text-tinta", ponto: "bg-slate-600" },
};

export interface LinhaDocumento {
  chave: string;
  jornadaId: number;
  /** Documentos e pacotes abrem dentro do lead ("após o aceite" não: ainda não existe). */
  documentoId?: number;
  pacoteId?: number;
  titulo: string;
  sub: string;
  versao: string;
  selo: { rotulo: string; tom: Tom };
  /** ISO da criação/envio; null para o que só existe depois do aceite. */
  data: string | null;
}

interface ContextoLead {
  jornadaId: number;
  estado: EstadoJornada;
  /** Quem redige os documentos comerciais (o analista do lead). */
  autor?: string;
  /** Preenchido na visão de vários leads, para identificar de qual lead é a linha. */
  cliente?: string;
}

/** Documentos, pacotes e o que vem depois do aceite, com o selo de situação de cada um. */
export function linhasDocumentos(historico: HistoricoDocumentacao, ctx: ContextoLead): LinhaDocumento[] {
  const prefixo = ctx.cliente ? `${ctx.cliente} · ` : "";
  const ultimoPacote = historico.pacotes.at(-1);
  return [
    ...historico.documentos.map(
      (d): LinhaDocumento => ({
        chave: `${ctx.jornadaId}-d${d.id}`,
        jornadaId: ctx.jornadaId,
        documentoId: d.id,
        titulo: TIPO_DOCUMENTO[d.tipo] ?? d.tipo,
        sub: `${prefixo}${formatarData(d.criado_em, false)}${ctx.autor ? ` · ${ctx.autor}` : ""}`,
        versao: `v${d.versao}`,
        selo: d.status === "aprovado" ? { rotulo: "Aprovado", tom: "verde" } : { rotulo: "Rascunho", tom: "cinza" },
        data: d.criado_em,
      }),
    ),
    ...historico.pacotes.map(
      (p): LinhaDocumento => ({
        chave: `${ctx.jornadaId}-p${p.id}`,
        jornadaId: ctx.jornadaId,
        pacoteId: p.id,
        titulo: "Pacote de handoff",
        sub: `${prefixo}${p.enviado_em ? formatarData(p.enviado_em, false) : "—"} · snapshot ${p.hash.slice(0, 4)}…`,
        versao: `v${p.versao}`,
        selo:
          p !== ultimoPacote
            ? { rotulo: "Substituído", tom: "cinza" }
            : ctx.estado === "HANDOFF_ENVIADO"
              ? { rotulo: "Aguardando aceite", tom: "azul" }
              : DEPOIS_DO_ACEITE.includes(ctx.estado)
                ? { rotulo: "Aceito", tom: "verde" }
                : { rotulo: "Devolvido", tom: "cinza" },
        data: p.enviado_em,
      }),
    ),
    ...historico.apos_o_aceite.map(
      (tipo): LinhaDocumento => ({
        chave: `${ctx.jornadaId}-a${tipo}`,
        jornadaId: ctx.jornadaId,
        titulo: TIPO_DOCUMENTO[tipo] ?? tipo,
        sub: `${prefixo}${tipo === "pauta_kickoff" ? "Gerada" : "Gerado"} a partir do pacote aceito`,
        versao: "—",
        selo: { rotulo: "Após o aceite", tom: "cinza" },
        data: null,
      }),
    ),
  ];
}

function IconeDocumento() {
  return (
    <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-azul-suave text-azul">
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 6h16M4 11h16M4 16h10" />
      </svg>
    </span>
  );
}

interface ListaDocumentosProps {
  linhas: LinhaDocumento[];
  /** No histórico cada linha leva à página do lead (documento já aberto); dentro do lead, use `aoAbrir`. */
  comLink?: boolean;
  /** Dentro do lead: abre o documento ao lado da evidência. */
  aoAbrir?: (documentoId: number) => void;
  /** Dentro do lead: abre a prévia das 16 seções do pacote. */
  aoAbrirPacote?: (pacoteId: number) => void;
  vazio?: string;
}

export function ListaDocumentos({ linhas, comLink = false, aoAbrir, aoAbrirPacote, vazio = "Nenhum documento gerado ainda." }: ListaDocumentosProps) {
  if (linhas.length === 0) return <p className="text-sm text-cinza">{vazio}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {linhas.map((l) => {
        const cor = COR_SELO[l.selo.tom];
        const conteudo = (
          <>
            <IconeDocumento />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-tinta">{l.titulo}</p>
              <p className="mt-1 truncate text-sm text-cinza">{l.sub}</p>
            </div>
            <span className="hidden w-14 shrink-0 rounded-full bg-slate-100 py-1.5 text-center text-sm font-semibold text-tinta sm:block">
              {l.versao}
            </span>
            <div className="flex shrink-0 justify-end sm:w-56">
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${cor.fundo}`}>
                <span aria-hidden className={`h-2 w-2 rounded-full ${cor.ponto}`} />
                {l.selo.rotulo}
              </span>
            </div>
          </>
        );
        return (
          <li key={l.chave}>
            {comLink ? (
              <Link
                href={`/jornadas/${l.jornadaId}${l.documentoId ? `?documento=${l.documentoId}` : ""}`}
                className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-1 transition hover:bg-fundo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 sm:gap-8"
              >
                {conteudo}
              </Link>
            ) : (aoAbrir && l.documentoId) || (aoAbrirPacote && l.pacoteId) ? (
              <button
                type="button"
                onClick={() => (l.documentoId ? aoAbrir!(l.documentoId) : aoAbrirPacote!(l.pacoteId!))}
                className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-4 rounded-lg px-2 py-1 text-left transition hover:bg-fundo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 sm:gap-8"
              >
                {conteudo}
              </button>
            ) : (
              <div className="flex items-center gap-4 sm:gap-8">{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
