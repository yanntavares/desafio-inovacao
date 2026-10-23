"use client";

import { useEffect, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { DetalheJornada, DocumentoCompleto } from "@/lib/tipos";
import { TIPO_DOCUMENTO } from "./HistoricoDocumentos";
import { TrechoEvidencia } from "./TrechoEvidencia";

const COMERCIAIS = ["resumo_comercial", "briefing_comercial"];

interface PainelDocumentoProps {
  documentoId: number;
  jornada: DetalheJornada;
  /** Editar um aprovado cria outra versão: o painel passa a mostrar o novo id. */
  aoTrocar: (documentoId: number) => void;
  aoFechar: () => void;
  /** Recarrega o lead depois de editar ou aprovar. */
  aoMudar: () => void;
}

/** Markdown mínimo do redator (título, seção, item). Dentro de botão vira `span`, que é o que o HTML aceita ali. */
function Linha({ texto, emBotao = false }: { texto: string; emBotao?: boolean }) {
  if (!texto.trim()) return null;
  const [Tag, classe, corpo] = texto.startsWith("# ")
    ? (["h3", "text-xl font-bold text-azul-escuro", texto.slice(2)] as const)
    : texto.startsWith("## ")
      ? (["h4", "mt-3 font-bold text-azul-escuro", texto.slice(3)] as const)
      : texto.startsWith("- ")
        ? ([
            "p",
            "pl-4",
            <>
              <span aria-hidden className="-ml-4 mr-2">•</span>
              {texto.slice(2)}
            </>,
          ] as const)
        : (["p", "", texto] as const);
  const Elemento = emBotao ? "span" : Tag;
  return <Elemento className={`block ${classe}`}>{corpo}</Elemento>;
}

/** Documento versionado: cada parágrafo ligado a itens abre a evidência; aprovado é imutável. */
export function PainelDocumento({ documentoId, jornada, aoTrocar, aoFechar, aoMudar }: PainelDocumentoProps) {
  const { sessao } = useAuth();
  const { token, usuario } = sessao!;
  const [doc, setDoc] = useState<DocumentoCompleto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let ativo = true;
    apiJornadas
      .documento(token, documentoId)
      .then((d) => ativo && (setDoc(d), setErro(null)))
      .catch((e: unknown) => ativo && setErro(e instanceof ErroApi ? e.message : "Não foi possível abrir o documento."));
    return () => {
      ativo = false;
    };
  }, [token, documentoId]);

  if (!doc) {
    return (
      <section className="rounded-xl border-2 border-azul bg-white p-6">
        {erro ? <AlertaErro mensagem={erro} /> : <p role="status" className="text-sm text-cinza">Abrindo documento…</p>}
      </section>
    );
  }

  const comercial = COMERCIAIS.includes(doc.tipo);
  const ehAnalista = usuario.papel === "comercial" && usuario.id === jornada.analista.id;
  const ehGerente = usuario.papel === "gerente" && usuario.id === jornada.gerente?.id;
  const podeEditar = comercial && ehAnalista;
  // Briefing de projeto: o G4 diz se libera e, se não, por quê. Os demais seguem o dono do documento.
  const aprovar =
    doc.status === "aprovado"
      ? null
      : doc.tipo === "briefing_projeto"
        ? jornada.gates.G4
        : (comercial ? ehAnalista : ehGerente)
          ? { liberado: true, motivo: null }
          : { liberado: false, motivo: comercial ? "Só o analista responsável aprova este documento." : "Só o gerente designado aprova este documento." };
  const vinculos = new Map(doc.itens.map((v) => [v.paragrafo, v.item_ids]));

  async function agir(acao: () => Promise<DocumentoCompleto>) {
    setOcupado(true);
    setErro(null);
    try {
      const novo = await acao();
      setRascunho(null);
      if (novo.id === doc!.id) setDoc(novo);
      else aoTrocar(novo.id);
      aoMudar();
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível salvar. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  // ponytail: exporta o markdown já carregado; é o mesmo corpo de GET /documentos/{id}/exportar, sem outra ida à API.
  function exportar() {
    const url = URL.createObjectURL(new Blob([doc!.conteudo_md], { type: "text/markdown;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${doc!.tipo}_v${doc!.versao}.md` });
    a.click();
    URL.revokeObjectURL(url);
  }

  const botao =
    "h-11 rounded-lg px-4 font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section aria-label="Documento aberto" className="rounded-xl border-2 border-azul bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)] lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-azul-escuro">
            {TIPO_DOCUMENTO[doc.tipo] ?? doc.tipo} · v{doc.versao}
          </h2>
          <p className="mt-1 text-[15px] text-cinza">
            {doc.status === "aprovado" ? "Aprovado · imutável, editar cria nova versão" : "Rascunho"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportar} className={`${botao} bg-azul-suave text-azul`}>
            Exportar .md
          </button>
          {podeEditar && rascunho === null && (
            <button type="button" onClick={() => setRascunho(doc.conteudo_md)} className={`${botao} bg-azul-suave text-azul`}>
              Editar
            </button>
          )}
          <button type="button" onClick={aoFechar} className={`${botao} text-azul-escuro hover:bg-fundo`}>
            Fechar
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <AlertaErro mensagem={erro} />
        {rascunho !== null ? (
          <>
            <label htmlFor="editar-documento" className="text-sm font-semibold text-tinta">
              Texto do documento (markdown)
            </label>
            <textarea
              id="editar-documento"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              rows={16}
              className="rounded-lg border border-slate-300 p-3 font-mono text-sm focus:border-azul focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={ocupado || !rascunho.trim()}
                onClick={() => agir(() => apiJornadas.editarDocumento(token, doc.id, rascunho))}
                className={`${botao} bg-azul text-white hover:bg-[#04549a]`}
              >
                {ocupado ? "Salvando…" : doc.status === "aprovado" ? "Salvar como nova versão" : "Salvar"}
              </button>
              <button type="button" disabled={ocupado} onClick={() => setRascunho(null)} className={`${botao} text-azul-escuro hover:bg-fundo`}>
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1 text-[15px] text-tinta">
            {doc.conteudo_md.split("\n").map((texto, i) => {
              const ids = vinculos.get(i);
              if (!ids) return <Linha key={i} texto={texto} />;
              return (
                <div key={i}>
                  <button
                    type="button"
                    aria-expanded={aberto === i}
                    onClick={() => setAberto(aberto === i ? null : i)}
                    title="Ver a evidência na transcrição"
                    className="w-full rounded text-left decoration-azul/50 underline-offset-4 hover:bg-azul-suave hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40"
                  >
                    <Linha texto={texto} emBotao />
                  </button>
                  {aberto === i && ids.map((id) => <TrechoEvidencia key={id} itemId={id} />)}
                </div>
              );
            })}
          </div>
        )}

        {aprovar && rascunho === null && (
          <>
            <button
              type="button"
              disabled={!aprovar.liberado || ocupado}
              onClick={() => agir(() => apiJornadas.aprovarDocumento(token, doc.id))}
              className="mt-2 h-14 rounded-lg bg-lima text-lg font-bold text-azul-escuro transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lima/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ocupado ? "Aprovando…" : doc.tipo === "briefing_projeto" ? "Aprovar briefing (G4)" : "Aprovar documento"}
            </button>
            {!aprovar.liberado && aprovar.motivo && <p className="text-sm text-cinza">{aprovar.motivo}</p>}
          </>
        )}
      </div>
    </section>
  );
}
