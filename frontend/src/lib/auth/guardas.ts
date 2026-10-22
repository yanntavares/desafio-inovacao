"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import { podeAbrir, rotaInicial } from "@/lib/rotas";

/** Telas públicas (login, cadastro): quem já tem sessão vai direto à tela do seu papel. */
export function useRedirecionarSeLogado(): void {
  const { pronto, sessao } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (pronto && sessao) router.replace(rotaInicial(sessao.usuario.papel));
  }, [pronto, sessao, router]);
}

/**
 * Telas autenticadas: sem sessão → login; rota de outro papel → tela inicial do papel.
 * É conveniência de navegação; quem barra de verdade é a API (403).
 */
export function useExigirSessao(): boolean {
  const { pronto, sessao } = useAuth();
  const router = useRouter();
  const caminho = usePathname();
  const liberado = Boolean(sessao && podeAbrir(sessao.usuario.papel, caminho));

  useEffect(() => {
    if (!pronto) return;
    if (!sessao) router.replace("/login");
    else if (!liberado) router.replace(rotaInicial(sessao.usuario.papel));
  }, [pronto, sessao, liberado, router]);

  return pronto && liberado;
}
