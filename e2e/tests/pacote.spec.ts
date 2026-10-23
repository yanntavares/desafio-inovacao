import { expect, test } from "@playwright/test";
import { entrarNaApi, idDoLead } from "../support/api";
import { URL_API } from "../playwright.config";
import { entrarComo } from "../support/sessao";

// Só leitura: não altera o seed, então não recarrega a demonstração.
const pacoteAberto = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Pacote aberto" });
const documentoAberto = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Documento aberto" });

test("o gerente abre a prévia do pacote e vê o trecho que sustenta um item", async ({ page }) => {
  const id = await idDoLead("Clínica Vitalis"); // HANDOFF_ENVIADO, gerente Rafael
  await entrarComo(page, "rafael.lima");
  await page.goto(`/jornadas/${id}`);

  await page.getByRole("button", { name: /^Ver pacote v\d+$/ }).click();
  const painel = pacoteAberto(page);
  await expect(painel.getByRole("heading", { name: /Pacote de handoff · v\d+/ })).toBeVisible();
  await expect(painel.getByText(/Snapshot imutável/)).toBeVisible();

  // evidência a um clique também dentro da prévia
  const primeiroItem = painel.getByRole("button", { expanded: false }).first();
  await primeiroItem.click();
  await expect(painel.locator("blockquote").first()).toBeVisible();
});

test("Ver resumo gerencial troca a prévia do pacote pelo documento", async ({ page }) => {
  const id = await idDoLead("Clínica Vitalis");
  await entrarComo(page, "rafael.lima");
  await page.goto(`/jornadas/${id}`);

  await page.getByRole("button", { name: /^Ver pacote v\d+$/ }).click();
  await expect(pacoteAberto(page)).toBeVisible();
  await page.getByRole("button", { name: /^Ver resumo gerencial v\d+$/ }).click();

  await expect(documentoAberto(page).getByRole("heading", { name: /Resumo gerencial · v\d+/ })).toBeVisible();
  await expect(pacoteAberto(page)).toHaveCount(0); // um visualizador por vez
});

test("a linha do pacote no histórico do lead abre a prévia", async ({ page }) => {
  const id = await idDoLead("Clínica Vitalis");
  await entrarComo(page, "marina.costa"); // analista dona do lead
  await page.goto(`/jornadas/${id}`);
  await page.getByRole("tab", { name: "Histórico de documentação" }).click();

  await page.getByRole("button", { name: /Pacote de handoff/ }).click();
  await expect(pacoteAberto(page).getByRole("heading", { name: /Pacote de handoff · v\d+/ })).toBeVisible();
});

test("a API não entrega o pacote a quem não vê o lead", async ({ request }) => {
  // invariante 3: o isolamento de carteira vale também no endpoint novo
  const id = await idDoLead("Clínica Vitalis");
  const rafael = await entrarNaApi("rafael.lima");
  const pacotes = await (
    await request.get(`${URL_API}/jornadas/${id}/pacotes`, { headers: { Authorization: `Bearer ${rafael.token}` } })
  ).json();
  const lucas = await entrarNaApi("lucas.prado"); // analista de outra carteira
  const resposta = await request.get(`${URL_API}/pacotes/${pacotes[0].id}`, {
    headers: { Authorization: `Bearer ${lucas.token}` },
  });
  expect([403, 404]).toContain(resposta.status());
});
