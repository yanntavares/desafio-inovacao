"use client";

import { useEffect, useRef } from "react";
import type { ReuniaoCompleta } from "@/lib/tipos";

/** Trecho citado por um item: segmento da transcrição e, quando há, o recorte literal (offsets no texto mascarado). */
export interface Destaque {
  segmento: number;
  inicio?: number;
  fim?: number;
}

interface TranscricaoProps {
  reuniao: ReuniaoCompleta;
  destaques: Destaque[];
}

function Segmento({ texto, destaque }: { texto: string; destaque?: Destaque }) {
  const { inicio, fim } = destaque ?? {};
  if (inicio === undefined || fim === undefined || fim > texto.length || inicio >= fim) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, inicio)}
      <mark className="rounded bg-lima px-0.5 text-tinta">{texto.slice(inicio, fim)}</mark>
      {texto.slice(fim)}
    </>
  );
}

/** Transcrição mascarada (é nela que valem os offsets da evidência), com o trecho do item selecionado em destaque. */
export function Transcricao({ reuniao, destaques }: TranscricaoProps) {
  const primeiro = useRef<HTMLLIElement | null>(null);
  const chave = destaques.map((d) => `${d.segmento}:${d.inicio}`).join("|");

  useEffect(() => {
    // rola só a caixa da transcrição (block: "nearest" não move a página inteira)
    primeiro.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [chave, reuniao.id]);

  const citados = new Set(destaques.map((d) => d.segmento));
  const primeiroCitado = Math.min(...destaques.map((d) => d.segmento), Infinity);

  return (
    <div>
      <p className="mb-3 text-sm text-cinza">
        {reuniao.titulo} · {reuniao.dados_mascarados} dado(s) pessoal(is) mascarado(s)
      </p>
      <ol aria-label="Transcrição da reunião" className="flex flex-col gap-2">
        {reuniao.segmentos.map((s) => {
          const citado = citados.has(s.ordem);
          return (
            <li
              key={s.ordem}
              ref={s.ordem === primeiroCitado ? primeiro : undefined}
              aria-current={citado ? "true" : undefined}
              className={`rounded-lg border-l-4 px-3 py-2 text-[15px] leading-relaxed ${
                citado ? "border-azul bg-azul-suave" : "border-transparent"
              }`}
            >
              <span className="font-semibold text-azul-escuro">{s.falante}:</span>{" "}
              <Segmento texto={s.texto_mascarado} destaque={destaques.find((d) => d.segmento === s.ordem)} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
