import type { Page } from "@playwright/test";

/**
 * Alertas do app (erros de formulário e de API). O Next injeta um `role="alert"` vazio para anunciar
 * rotas; `getByRole("alert")` pegaria os dois e quebraria o modo estrito do Playwright.
 */
export const alerta = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');
