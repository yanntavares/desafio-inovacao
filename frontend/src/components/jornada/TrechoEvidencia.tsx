"use client";

import { useEffect, useState } from "react";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Evidencia } from "@/lib/tipos";

/** Evidência a um clique: busca o trecho da transcrição quando é aberta. */
export function TrechoEvidencia({ itemId }: { itemId: number }) {
  const { sessao } = useAuth();
  const [dados, setDados] = useState<Evidencia | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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

  return (
    <div className="mt-2 ml-5 rounded-lg border-l-4 border-azul bg-azul-suave px-4 py-3 text-sm text-tinta">
      {erro ? (
        <p role="alert" className="text-perigo">{erro}</p>
      ) : !dados ? (
        <p role="status" className="text-cinza">Carregando evidência…</p>
      ) : dados.evidencias.length > 0 ? (
        dados.evidencias.map((ev) => (
          <blockquote key={ev.segmento_ordem} className="not-first:mt-2">
            <span className="font-semibold">
              {ev.falante} · segmento {ev.segmento_ordem}:
            </span>{" "}
            “{ev.trecho ?? ev.texto}”
          </blockquote>
        ))
      ) : (
        <p className="text-cinza">Sem trecho na transcrição: item tratado como inferido.</p>
      )}
    </div>
  );
}
