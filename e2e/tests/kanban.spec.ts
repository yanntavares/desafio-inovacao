import { expect, type Page, test } from "@playwright/test";
import { entrarComo } from "../support/sessao";

const card = (page: Page, cliente: string) => page.getByRole("link", { name: new RegExp(cliente) });

test("analista vê só a própria carteira e o aviso de restrição", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/kanban/meus-leads");
  await expect(page.getByText(/Você vê apenas os seus leads \(\d+ de \d+\)/)).toBeVisible();
  for (const meu of ["Studio Nômade", "ONG Maré Viva", "Instituto Horizonte", "Mercado Pátio", "Clínica Vitalis"]) {
    await expect(card(page, meu)).toBeVisible();
  }
  // leads do Lucas e a jornada concluída (que vai ao Histórico) não aparecem
  for (const alheio of ["Escola Aurora", "Café Bonanza", "Rede Folha", "Ateliê Vento Sul"]) {
    await expect(card(page, alheio)).toHaveCount(0);
  }
  await expect(page.getByRole("link", { name: /Cadastrar reunião/ }).first()).toBeVisible();
});

test("cada lead cai na coluna da sua etapa", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/kanban/meus-leads");
  const coluna = (etapa: string) => page.getByRole("region", { name: etapa });
  await expect(coluna("Nova reunião").getByRole("link", { name: /Studio Nômade/ })).toBeVisible();
  await expect(coluna("Em validação").getByRole("link", { name: /Instituto Horizonte/ })).toBeVisible();
  await expect(coluna("Validada").getByRole("link", { name: /Mercado Pátio/ })).toBeVisible();
  await expect(coluna("Handoff enviado").getByRole("link", { name: /Clínica Vitalis/ })).toBeVisible();
  await expect(coluna("Aceito").getByText("Nenhum lead")).toBeVisible();
});

test("o card mostra bloqueantes e completude", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/kanban/meus-leads");
  const horizonte = card(page, "Instituto Horizonte");
  await expect(horizonte).toContainText(/\d+ bloq\./);
  await expect(horizonte.getByRole("progressbar", { name: "Completude do pacote" })).toHaveAttribute("aria-valuenow", /\d+/);
});

test("gerente vê todos os leads e filtra por analista", async ({ page }) => {
  await entrarComo(page, "rafael.lima");
  await page.goto("/kanban/geral");
  await expect(page.getByText(/Você vê todos os leads \(\d+\)/)).toBeVisible();
  await expect(card(page, "Escola Aurora")).toBeVisible(); // do Lucas
  await expect(card(page, "Studio Nômade")).toBeVisible(); // da Marina

  await page.getByRole("combobox", { name: "Filtrar por analista" }).selectOption({ label: "Lucas Prado" });
  await expect(card(page, "Escola Aurora")).toBeVisible();
  await expect(card(page, "Studio Nômade")).toHaveCount(0);
});

test("filtro de pendência bloqueante esconde os leads sem bloqueio", async ({ page }) => {
  await entrarComo(page, "rafael.lima");
  await page.goto("/kanban/geral");
  await page.getByRole("checkbox", { name: "Só com pendência bloqueante" }).check();
  await expect(card(page, "Instituto Horizonte")).toBeVisible();
  await expect(card(page, "Mercado Pátio")).toHaveCount(0);
  await expect(card(page, "Studio Nômade")).toHaveCount(0);
});

test("o card leva à página do lead", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/kanban/meus-leads");
  await card(page, "Mercado Pátio").click();
  await expect(page).toHaveURL(/\/jornadas\/\d+$/);
  await expect(page.getByRole("heading", { name: "Mercado Pátio", level: 1 })).toBeVisible();
});

test("o analista não abre telas de outro papel", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/diretoria");
  await expect(page).toHaveURL(/\/kanban\/meus-leads$/); // volta à tela inicial do papel
});
