import { expect, test } from "@playwright/test";
import { idDoLead, itensDoLead, recarregarDemonstracao } from "../support/api";
import { entrarComo } from "../support/sessao";

// Mexe nos itens e pendências do Instituto Horizonte: parte do seed e o devolve intacto.
test.describe.configure({ mode: "serial" });
test.beforeAll(recarregarDemonstracao);
test.afterAll(recarregarDemonstracao);

test("a natureza começa vazia: a IA não decide", async ({ page }) => {
  const id = await idDoLead("Instituto Horizonte");
  await entrarComo(page, "marina.costa");
  await page.goto(`/jornadas/${id}`);
  const natureza = page.getByLabel("Natureza do item").first();
  await expect(natureza).toHaveValue("");
  await expect(page.getByRole("button", { name: "Confirmar" }).first()).toBeDisabled();
  await expect(page.getByText("Escolha a natureza do item: a IA não decide.").first()).toBeVisible();
});

test("escolher a natureza e confirmar grava a decisão da pessoa", async ({ page }) => {
  const id = await idDoLead("Instituto Horizonte");
  const antes = (await itensDoLead(id)).filter((i) => i.status_validacao === "pendente").length;
  await entrarComo(page, "marina.costa");
  await page.goto(`/jornadas/${id}`);
  await page.getByLabel("Natureza do item").first().selectOption("acordado");
  await page.getByRole("button", { name: "Confirmar" }).first().click();
  await expect.poll(async () => (await itensDoLead(id)).filter((i) => i.status_validacao === "pendente").length).toBe(antes - 1);
});

test("aceitar com risco exige justificativa e libera o G2 quando as bloqueantes acabam", async ({ page }) => {
  const id = await idDoLead("Instituto Horizonte");
  await entrarComo(page, "marina.costa");
  await page.goto(`/jornadas/${id}`);
  const g2 = page.getByRole("button", { name: "Confirmar documentação (G2)" });
  await expect(g2).toBeDisabled();

  for (const restantes of [1, 0]) {
    const pendencia = page.locator("li", { has: page.getByText("Bloqueante", { exact: true }) }).filter({
      has: page.getByRole("button", { name: "Aceitar com risco" }),
    }).first();
    await pendencia.getByRole("button", { name: "Aceitar com risco" }).click();
    await expect(pendencia.getByRole("button", { name: "Registrar" })).toBeDisabled();
    await expect(pendencia.getByText("Aceitar com risco exige uma justificativa.")).toBeVisible();
    await pendencia.getByLabel("Justificativa").fill("Cliente confirma na próxima reunião.");
    await pendencia.getByRole("button", { name: "Registrar" }).click();
    if (restantes) await expect(page.getByText(`${restantes} pendência bloqueante aberta.`)).toBeVisible();
  }
  await expect(g2).toBeEnabled();
});
