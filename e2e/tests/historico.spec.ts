import { expect, type Page, test } from "@playwright/test";
import { entrarComo } from "../support/sessao";

const linha = (page: Page, cliente: string) => page.getByRole("row", { name: new RegExp(cliente) });
const VAZIO = /Nenhuma jornada concluída ainda/;

test("o dono vê o lead concluído e abre a página dele", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/historico");
  await expect(page.getByRole("heading", { name: "Histórico", level: 1 })).toBeVisible();
  await expect(linha(page, "Ateliê Vento Sul")).toBeVisible();
  await linha(page, "Ateliê Vento Sul").getByRole("link", { name: "Abrir lead" }).click();
  await expect(page).toHaveURL(/\/jornadas\/\d+$/);
  await expect(page.getByRole("heading", { name: "Ateliê Vento Sul", level: 1 })).toBeVisible();
});

test("outro analista vê o estado vazio (isolamento da carteira)", async ({ page }) => {
  await entrarComo(page, "lucas.prado");
  await page.goto("/historico");
  await expect(page.getByText(VAZIO)).toBeVisible();
  await expect(page.getByRole("row", { name: /Ateliê Vento Sul/ })).toHaveCount(0);
});

test("o analista não tem filtro por analista", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/historico");
  await expect(page.getByRole("heading", { name: "Histórico", level: 1 })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Filtrar por analista" })).toHaveCount(0);
});

for (const quem of ["rafael.lima", "paulo.nunes"]) {
  test(`${quem} vê todos e filtra por analista`, async ({ page }) => {
    await entrarComo(page, quem);
    await page.goto("/historico");
    await expect(linha(page, "Ateliê Vento Sul")).toBeVisible();
    const filtro = page.getByRole("combobox", { name: "Filtrar por analista" });
    await filtro.selectOption({ label: "Lucas Prado" });
    await expect(page.getByText(VAZIO)).toBeVisible();
    await filtro.selectOption({ label: "Marina Costa" });
    await expect(linha(page, "Ateliê Vento Sul")).toBeVisible();
  });
}
