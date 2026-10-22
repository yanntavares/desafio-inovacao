import type { Page } from "@playwright/test";
import { entrarNaApi } from "./api";

/**
 * Abre o app já logado como o usuário do seed, sem passar pela tela de login (que tem teste próprio).
 * A sessão do front fica em localStorage["ponte.sessao"] como `{token, usuario, demo}`.
 */
export async function entrarComo(page: Page, chave: string): Promise<void> {
  const sessao = await entrarNaApi(chave);
  await page.addInitScript((valor) => window.localStorage.setItem("ponte.sessao", valor), JSON.stringify({ ...sessao, demo: true }));
}
