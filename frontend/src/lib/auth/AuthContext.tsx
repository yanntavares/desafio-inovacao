"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { apiAuth, ErroApi } from "@/lib/api";
import type { Papel, RespostaSessao, Sessao } from "@/lib/tipos";

const CHAVE = "ponte.sessao";
const EVENTO = "ponte:sessao";
// O token vale 480 min (jwt_expira_minutos); renovar bem antes evita queda no meio da demonstração.
const RENOVAR_A_CADA_MS = 30 * 60 * 1000;

// --- armazenamento ---------------------------------------------------------------

let brutoEmCache: string | null = null;
let sessaoEmCache: Sessao | null = null;

function lerSessao(): Sessao | null {
  const bruto = window.localStorage.getItem(CHAVE);
  if (bruto !== brutoEmCache) {
    brutoEmCache = bruto;
    try {
      sessaoEmCache = bruto ? (JSON.parse(bruto) as Sessao) : null;
    } catch {
      sessaoEmCache = null;
    }
  }
  return sessaoEmCache;
}

function gravarSessao(sessao: Sessao | null): void {
  if (sessao) window.localStorage.setItem(CHAVE, JSON.stringify(sessao));
  else window.localStorage.removeItem(CHAVE);
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(aoMudar: () => void): () => void {
  // "storage" sincroniza outras abas; o evento próprio cobre a aba atual.
  window.addEventListener("storage", aoMudar);
  window.addEventListener(EVENTO, aoMudar);
  return () => {
    window.removeEventListener("storage", aoMudar);
    window.removeEventListener(EVENTO, aoMudar);
  };
}

const semAssinatura = () => () => {};

// --- contexto --------------------------------------------------------------------

interface ValorAuth {
  /** false até o navegador hidratar; antes disso não dá para saber se há sessão. */
  pronto: boolean;
  sessao: Sessao | null;
  entrar: (resposta: RespostaSessao, demo?: boolean) => Sessao;
  sair: () => void;
  trocarPapelDemo: (papel: Papel) => Promise<Sessao>;
}

const ContextoAuth = createContext<ValorAuth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pronto = useSyncExternalStore(semAssinatura, () => true, () => false);
  const sessao = useSyncExternalStore(assinar, lerSessao, () => null);

  const entrar = useCallback((resposta: RespostaSessao, demo = false) => {
    const nova: Sessao = { ...resposta, demo };
    gravarSessao(nova);
    return nova;
  }, []);

  const sair = useCallback(() => gravarSessao(null), []);

  const trocarPapelDemo = useCallback(
    async (papel: Papel) => entrar(await apiAuth.entrarDemo(papel), true),
    [entrar],
  );

  const token = sessao?.token;
  const demo = sessao?.demo ?? false;
  useEffect(() => {
    if (!token) return;
    const id = window.setInterval(() => {
      apiAuth
        .renovar(token)
        .then((r) => gravarSessao({ ...r, demo }))
        .catch((erro: unknown) => {
          if (erro instanceof ErroApi && erro.status === 401) gravarSessao(null);
        });
    }, RENOVAR_A_CADA_MS);
    return () => window.clearInterval(id);
  }, [token, demo]);

  const valor = useMemo(
    () => ({ pronto, sessao, entrar, sair, trocarPapelDemo }),
    [pronto, sessao, entrar, sair, trocarPapelDemo],
  );
  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>;
}

export function useAuth(): ValorAuth {
  const valor = useContext(ContextoAuth);
  if (!valor) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return valor;
}
