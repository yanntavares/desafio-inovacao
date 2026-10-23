"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErroApi } from "./api";

interface Opcoes<T> {
  /** Número fixo ou calculado dos últimos dados (ex.: mais rápido enquanto há extração em curso). */
  intervaloMs?: number | ((dados: T | null) => number | undefined);
}

/**
 * Leitura da API com atualização automática: o polling só roda com a aba visível e há busca
 * imediata ao voltar a ela. `chave` identifica a consulta; ao mudar, a resposta antiga é descartada.
 */
export function useLeitura<T>(chave: string | null, carregar: () => Promise<T>, { intervaloMs }: Opcoes<T> = {}) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [versao, setVersao] = useState(0);
  const carregarAtual = useRef(carregar);
  useEffect(() => {
    carregarAtual.current = carregar;
  });
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const ms = typeof intervaloMs === "function" ? intervaloMs(dados) : intervaloMs;

  useEffect(() => {
    if (!chave) return;
    let ativo = true;
    const buscar = () => {
      if (document.visibilityState === "hidden") return;
      carregarAtual.current().then(
        (d) => {
          if (!ativo) return;
          setDados(d);
          setErro(null);
          setAtualizadoEm(new Date());
        },
        (e: unknown) => {
          if (ativo) setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar. Tente de novo.");
        },
      );
    };
    buscar();
    const timer = ms ? setInterval(buscar, ms) : undefined;
    document.addEventListener("visibilitychange", buscar);
    return () => {
      ativo = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", buscar);
    };
  }, [chave, ms, versao]);

  return { dados, erro, atualizadoEm, recarregar };
}
