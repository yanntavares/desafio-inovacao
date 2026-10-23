import { defineConfig, devices } from "@playwright/test";

// A stack sobe fora dos testes (`make up`): o front em :3000 e a API em :8000.
export const URL_FRONT = process.env.E2E_FRONT_URL ?? "http://localhost:3000";
export const URL_API = process.env.E2E_API_URL ?? "http://localhost:8000";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./support/preparar.ts",
  // Os testes dividem um banco só e alguns o alteram (extração): sem paralelismo.
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: URL_FRONT,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    // Imagens só como evidência de falha; os testes conferem texto, URL e estado dos botões.
    screenshot: "only-on-failure",
    // E2E_NAVEGADOR=msedge usa o Edge instalado e dispensa baixar o Chromium do Playwright.
    channel: process.env.E2E_NAVEGADOR || undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.E2E_NAVEGADOR || undefined, viewport: { width: 1440, height: 900 } } }],
});
