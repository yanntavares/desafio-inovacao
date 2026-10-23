"use client";

import { createContext, useContext, useEffect } from "react";

// O shell guarda o título da página atual para a trilha do cabeçalho (ex.: o nome do lead).
export const MigalhaContext = createContext<(titulo: string | null) => void>(() => {});

/** A página informa o título que aparece na trilha; some ao sair da página. */
export function useMigalha(titulo: string | undefined) {
  const definir = useContext(MigalhaContext);
  useEffect(() => {
    definir(titulo ?? null);
    return () => definir(null);
  }, [definir, titulo]);
}
