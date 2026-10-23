"use client";

import { useId, useRef } from "react";
import { GrupoAlternancia } from "@/components/formulario/GrupoAlternancia";
import { IconeCheckCirculo } from "@/components/icones";
import type { PreVisualizacao } from "@/lib/tipos";

export type ModoTranscricao = "arquivo" | "texto";

/** Resultado de POST /reunioes/pre-visualizar para o conteúdo atual. */
export type EstadoPrevia =
  | { tipo: "vazio" }
  | { tipo: "verificando" }
  | { tipo: "valido"; dados: PreVisualizacao }
  | { tipo: "invalido"; mensagem: string };

export const EXTENSOES_ACEITAS = [".txt", ".md", ".vtt", ".srt"];

interface UploadTranscricaoProps {
  modo: ModoTranscricao;
  aoMudarModo: (modo: ModoTranscricao) => void;
  arquivo: File | null;
  aoEscolherArquivo: (arquivo: File | null) => void;
  texto: string;
  aoMudarTexto: (texto: string) => void;
  previa: EstadoPrevia;
}

const numero = (n: number) => n.toLocaleString("pt-BR");

function extensao(nome: string): string {
  const i = nome.lastIndexOf(".");
  return i >= 0 ? nome.slice(i + 1).toUpperCase() : "?";
}

export function UploadTranscricao({
  modo,
  aoMudarModo,
  arquivo,
  aoEscolherArquivo,
  texto,
  aoMudarTexto,
  previa,
}: UploadTranscricaoProps) {
  const id = useId();
  const entradaArquivo = useRef<HTMLInputElement>(null);
  const abrirSeletor = () => entradaArquivo.current?.click();

  const borda =
    previa.tipo === "valido" ? "border-emerald-600" : previa.tipo === "invalido" ? "border-perigo" : "border-slate-300";

  return (
    <div>
      <GrupoAlternancia
        rotulo="Forma de envio da transcrição"
        variante="suave"
        valor={modo}
        aoMudar={aoMudarModo}
        opcoes={[
          { valor: "arquivo", rotulo: "Enviar arquivo" },
          { valor: "texto", rotulo: "Colar texto" },
        ]}
      />

      <input
        ref={entradaArquivo}
        type="file"
        accept={EXTENSOES_ACEITAS.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          aoEscolherArquivo(e.target.files?.[0] ?? null);
          e.target.value = ""; // permite escolher o mesmo arquivo de novo depois de corrigi-lo
        }}
      />

      <div className="mt-5">
        {modo === "arquivo" && !arquivo && (
          <button
            type="button"
            onClick={abrirSeletor}
            className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-fundo px-6 py-10 text-center transition hover:border-azul hover:bg-azul-suave/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30"
          >
            <span className="font-bold text-azul">Escolher arquivo</span>
            <span className="text-sm text-cinza">Transcrição exportada da ferramenta de reunião</span>
          </button>
        )}

        {modo === "arquivo" && arquivo && (
          <div className={`flex gap-5 rounded-xl border-2 bg-white p-5 ${borda}`}>
            <span className="grid h-20 w-16 shrink-0 place-items-center rounded-md border border-emerald-600/40 bg-emerald-50 text-sm font-bold text-emerald-800">
              {extensao(arquivo.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="truncate text-lg font-bold text-azul-escuro" title={arquivo.name}>
                  {arquivo.name}
                </p>
                <button type="button" onClick={abrirSeletor} className="text-[15px] font-bold text-azul hover:underline">
                  Trocar arquivo
                </button>
              </div>
              <ResumoPrevia previa={previa} />
            </div>
          </div>
        )}

        {modo === "texto" && (
          <div>
            <label htmlFor={`${id}-texto`} className="sr-only">
              Texto da transcrição
            </label>
            <textarea
              id={`${id}-texto`}
              value={texto}
              onChange={(e) => aoMudarTexto(e.target.value)}
              rows={10}
              placeholder="Cole aqui a transcrição ou a documentação da reunião"
              className={`w-full resize-y rounded-xl border-2 bg-white p-4 text-[15px] leading-relaxed text-tinta outline-none transition placeholder:text-cinza/60 focus:ring-2 focus:ring-azul/30 ${borda}`}
            />
            {previa.tipo !== "vazio" && <ResumoPrevia previa={previa} />}
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-cinza/80">Aceita .txt, .md, .vtt e .srt, até 15 mil palavras.</p>
    </div>
  );
}

function ResumoPrevia({ previa }: { previa: EstadoPrevia }) {
  if (previa.tipo === "vazio") return null;
  if (previa.tipo === "verificando") {
    return (
      <p role="status" className="mt-2 text-[15px] text-cinza">
        Verificando a transcrição…
      </p>
    );
  }
  if (previa.tipo === "invalido") {
    return (
      <p role="alert" className="mt-2 text-[15px] font-semibold text-perigo">
        {previa.mensagem}
      </p>
    );
  }

  const { palavras, segmentos, limite_palavras, dados_mascarados } = previa.dados;
  return (
    <div role="status" className="mt-1.5 space-y-1.5">
      <p className="text-[15px] text-cinza">
        {numero(palavras)} palavras · {numero(segmentos)} segmentos · limite de {numero(limite_palavras / 1000)} mil
      </p>
      <p className="flex items-center gap-2 text-[15px] font-bold text-emerald-700">
        <IconeCheckCirculo corFundo="#15803d" corCheck="#ffffff" className="h-5 w-5" /> Formato válido
      </p>
      {dados_mascarados > 0 && (
        <p className="rounded-md bg-lima-suave px-3 py-2 text-sm text-azul-escuro">
          {dados_mascarados === 1
            ? "1 dado pessoal será mascarado"
            : `${numero(dados_mascarados)} dados pessoais serão mascarados`}{" "}
          antes de o texto ir para a IA.
        </p>
      )}
    </div>
  );
}
