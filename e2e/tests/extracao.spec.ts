import { expect, test } from "@playwright/test";
import { contarItens, idDoLead, recarregarDemonstracao } from "../support/api";
import { simularFalhaDeExtracao } from "../support/banco";
import { entrarComo } from "../support/sessao";

// Este arquivo altera o banco (força uma falha); a demonstração é recarregada no fim.
test.afterAll(async () => {
  await recarregarDemonstracao();
});

test("falha na extração: 'Tentar de novo' reenfileira, a tela se atualiza sozinha e nada duplica", async ({ page }) => {
  const id = await idDoLead("Café Bonanza", "lucas.prado");
  const itensAntes = await contarItens(id);
  simularFalhaDeExtracao(id);

  await entrarComo(page, "lucas.prado"); // dono do lead
  await page.goto(`/jornadas/${id}`);
  await expect(page.getByRole("heading", { name: "A extração falhou" })).toBeVisible();
  await expect(page.getByText("Sua transcrição está preservada.")).toBeVisible();

  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByRole("heading", { name: "Extraindo a ficha" })).toBeVisible();
  // o worker conclui em segundo plano; a página atualiza sozinha (polling de 5 s), sem recarregar
  await expect(page.getByRole("heading", { name: "Extraindo a ficha" })).toHaveCount(0, { timeout: 40_000 });
  await expect(page.getByRole("heading", { name: "A extração falhou" })).toHaveCount(0);
  await expect(page.getByText("Em validação").first()).toBeVisible();

  expect(await contarItens(id)).toBe(itensAntes); // idempotência: "tentar de novo" não duplica
});

test("o card do kanban avisa a falha e leva ao lead", async ({ page }) => {
  const id = await idDoLead("Café Bonanza", "lucas.prado"); // precisa ter reunião para a falha fazer sentido
  simularFalhaDeExtracao(id);
  await entrarComo(page, "lucas.prado");
  await page.goto("/kanban/meus-leads");
  const card = page.getByRole("link", { name: /Café Bonanza/ });
  await expect(card).toContainText("Falha na extração");
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/jornadas/${id}$`));
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
});
