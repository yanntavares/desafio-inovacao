import { expect, type Page, test } from "@playwright/test";
import { entrarComo } from "../support/sessao";

// O nome do lead também está no <option> (oculto) do filtro: confere só as linhas da lista.
const linhaDoLead = (page: Page, cliente: string) => page.getByRole("link", { name: new RegExp(cliente) });

// O seed traz o Ateliê Vento Sul concluído (Marina + Rafael).
test("o analista vê o lead concluído em Histórico › enviadas", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/historico/enviadas");
  await expect(linhaDoLead(page, "Ateliê Vento Sul").first()).toBeVisible();
});

test("o gerente vê o lead que recebeu em Histórico › recebidas", async ({ page }) => {
  await entrarComo(page, "rafael.lima");
  await page.goto("/historico/recebidas");
  await expect(linhaDoLead(page, "Ateliê Vento Sul").first()).toBeVisible();
});

test("o documento do histórico abre já aberto na página do lead", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/historico/enviadas");
  await page.getByRole("link", { name: /Briefing de projeto/ }).first().click();
  await expect(page).toHaveURL(/\/jornadas\/\d+\?documento=\d+$/);
  await expect(page.getByRole("region", { name: "Documento aberto" })).toBeVisible();
});

test("outro analista não vê o lead concluído da Marina", async ({ page }) => {
  await entrarComo(page, "lucas.prado");
  await page.goto("/historico/enviadas");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(linhaDoLead(page, "Ateliê Vento Sul")).toHaveCount(0);
});
