import { expect, test } from "@playwright/test";
import { entrarNaApi, idDoLead } from "../support/api";
import { alerta } from "../support/dom";
import { URL_API } from "../playwright.config";
import { entrarComo } from "../support/sessao";

test.describe("página do lead: gate G3 (aceite do handoff)", () => {
  test("o gerente designado pode aceitar ou devolver", async ({ page }) => {
    const id = await idDoLead("Clínica Vitalis");
    await entrarComo(page, "rafael.lima"); // designado no seed
    await page.goto(`/jornadas/${id}`);
    await expect(page.getByRole("heading", { name: "Clínica Vitalis", level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Trilha" })).toHaveText("Kanban geral›Clínica Vitalis");
    await expect(page.getByRole("button", { name: "Aceitar handoff" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Devolver ao analista" })).toBeEnabled();
    await expect(page.getByText("Snapshot imutável · só nova versão altera")).toBeVisible();
  });

  test("outro gerente vê os botões desabilitados com o motivo escrito", async ({ page }) => {
    const id = await idDoLead("Clínica Vitalis");
    await entrarComo(page, "camila.reis"); // gerente, mas não a designada
    await page.goto(`/jornadas/${id}`);
    await expect(page.getByRole("button", { name: "Aceitar handoff" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Devolver ao analista" })).toBeDisabled();
    await expect(page.getByText("Só o gerente designado para este lead decide neste ponto.")).toBeVisible();
  });

  test("o analista que enviou não vê os botões do gerente (não aceita o próprio handoff)", async ({ page }) => {
    const id = await idDoLead("Clínica Vitalis");
    await entrarComo(page, "marina.costa");
    await page.goto(`/jornadas/${id}`);
    await expect(page.getByText("Aguardando aceite de Rafael Lima (G3).")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aceitar handoff" })).toHaveCount(0);
  });

  test("a API recusa o aceite do analista mesmo sem botão", async ({ request }) => {
    // invariante 3: o gate vive no serviço, não na interface
    const id = await idDoLead("Clínica Vitalis");
    const marina = await entrarNaApi("marina.costa");
    const resposta = await request.post(`${URL_API}/jornadas/${id}/handoff/aceitar`, {
      headers: { Authorization: `Bearer ${marina.token}` },
      data: { versao: 1 },
    });
    expect(resposta.status()).toBe(403);
  });
});

test.describe("página do lead: validação (G2) e evidência", () => {
  test("em validação, o motivo do G2 vem escrito com a contagem de bloqueantes", async ({ page }) => {
    const id = await idDoLead("Instituto Horizonte");
    await entrarComo(page, "marina.costa");
    await page.goto(`/jornadas/${id}`);
    await expect(page.getByRole("heading", { name: "Instituto Horizonte", level: 1 })).toBeVisible();
    await expect(page.getByText("2 pendências bloqueantes abertas.")).toBeVisible();
  });

  test("a evidência abre a um clique, com o falante e o trecho da transcrição", async ({ page }) => {
    const id = await idDoLead("Clínica Vitalis");
    await entrarComo(page, "rafael.lima");
    await page.goto(`/jornadas/${id}`);
    const item = page.getByRole("button", { name: /O problema é que os alunos/ });
    await expect(item).toHaveAttribute("aria-expanded", "false");
    await item.click();
    await expect(item).toHaveAttribute("aria-expanded", "true");
    const trecho = page.locator("blockquote").first();
    await expect(trecho).toBeVisible();
    await expect(trecho).toContainText(/Helena · segmento \d+:/);
    await expect(trecho).toContainText("rever as aulas gravadas");
    await item.click(); // um segundo clique fecha
    await expect(page.locator("blockquote")).toHaveCount(0);
  });

  test("o dado pessoal da transcrição aparece mascarado", async ({ page }) => {
    const id = await idDoLead("Clínica Vitalis");
    await entrarComo(page, "rafael.lima");
    await page.goto(`/jornadas/${id}`);
    await expect(page.getByText(/\d+ dados pessoais mascarados/)).toBeVisible();
    await expect(page.getByText("helena@exemplo.com.br")).toHaveCount(0);
  });
});

test("o lead de outro analista não abre para quem não é dono", async ({ page }) => {
  const id = await idDoLead("Escola Aurora"); // do Lucas
  await entrarComo(page, "marina.costa");
  await page.goto(`/jornadas/${id}`);
  await expect(alerta(page)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Escola Aurora", level: 1 })).toHaveCount(0);
});
