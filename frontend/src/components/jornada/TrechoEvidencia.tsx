"use client";

import { useEffect, useState } from "react";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Evidencia, ReuniaoCompleta } from "@/lib/tipos";
import { Transcricao } from "./Transcricao";

/** Evidência a um clique: busca o trecho da transcrição quando é aberta; dá para abrir a reunião inteira com o trecho destacado. */
export function TrechoEvidencia({ itemId }: { itemId: number }) {
  const { sessao } = useAuth();
  const [dados, setDados] = useState<Evidencia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [reuniao, setReuniao] = useState<ReuniaoCompleta | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [erroReuniao, setErroReuniao] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    apiJornadas
      .evidencia(sessao!.token, itemId)
      .then((d) => ativo && setDados(d))
      .catch(
        (e: unknown) =>
          ativo && setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar a evidência. Tente de novo."),
      );
    return () => {
      ativo = false;
    };
  }, [sessao, itemId]);

  const reuniaoId = dados?.evidencias.find((e) => e.reuniao_id)?.reuniao_id;

  async function alternarTranscricao() {
    if (reuniao) return setReuniao(null);
    if (!reuniaoId) return;
    setAbrindo(true);
    setErroReuniao(null);
    try {
      setReuniao(await apiJornadas.reuniao(sessao!.token, reuniaoId));
    } catch (e: unknown) {
      setErroReuniao(e instanceof ErroApi ? e.message : "Não foi possível carregar a transcrição. Tente de novo.");
    } finally {
      setAbrindo(false);
    }
  }

  return (
    <div className="mt-2 ml-5 rounded-lg border-l-4 border-azul bg-azul-suave px-4 py-3 text-sm text-tinta">
      {erro ? (
        <p role="alert" className="text-perigo">{erro}</p>
      ) : !dados ? (
        <p role="status" className="text-cinza">Carregando evidência…</p>
      ) : dados.evidencias.length > 0 ? (
        <>
          {dados.evidencias.map((ev) => (
            <blockquote key={ev.segmento_ordem} className="not-first:mt-2">
              <span className="font-semibold">
                {ev.falante} · segmento {ev.segmento_ordem}:
              </span>{" "}
              “{ev.trecho ?? ev.texto}”
            </blockquote>
          ))}
          {reuniaoId && (
            <>
              <button
                type="button"
                onClick={alternarTranscricao}
                disabled={abrindo}
                aria-expanded={!!reuniao}
                className="mt-3 text-sm font-semibold text-azul underline underline-offset-4 hover:text-azul-escuro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 disabled:opacity-60"
              >
                {abrindo ? "Abrindo…" : reuniao ? "Fechar a transcrição" : "Ver na transcrição completa"}
              </button>
              {erroReuniao && (
                <p role="alert" className="mt-2 text-perigo">
                  {erroReuniao}
                </p>
              )}
              {reuniao && (
                <div className="mt-3 max-h-80 overflow-y-auto rounded-lg bg-white p-3">
                  <Transcricao
                    reuniao={reuniao}
                    destaques={dados.evidencias.map((e) => ({ segmento: e.segmento_ordem, inicio: e.inicio, fim: e.fim }))}
                  />
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <p className="text-cinza">Sem trecho na transcrição: item tratado como inferido.</p>
      )}
    </div>
  );
}
