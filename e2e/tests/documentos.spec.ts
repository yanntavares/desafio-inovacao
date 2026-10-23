import { expect, test } from "@playwright/test";
import { entrarNaApi, idDoLead, recarregarDemonstracao } from "../support/api";
import { alerta } from "../support/dom";
import { URL_API } from "../playwright.config";
import { entrarComo } from "../support/sessao";

// Estes testes mudam o estado dos leads: partem do seed e o devolvem intacto para os outros specs.
test.describe.configure({ mode: "serial" });
test.beforeAll(recarregarDemonstracao);
test.afterAll(recarregarDemonstracao);

const documentoAberto = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Documento aberto" });

test("só o gerente designado age no G4: os outros veem quem age", async ({ page }) => {
  const id = await idDoLead("Rede Folha"); // ACEITO, gerente Camila
  await entrarComo(page, "rafael.lima");
  await page.goto(`/jornadas/${id}`);
  await expect(page.getByText(/Aguardando Camila Reis gerar e aprovar o briefing de projeto \(G4\)/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerar briefing de projeto" })).toHaveCount(0);
});

test("o técnico abre o briefing só para leitura, pelo link do histórico", async ({ page }) => {
  const id = await idDoLead("Rede Folha");
  const camila = await entrarNaApi("camila.reis");
  const doc = (await (
    await fetch(`${URL_API}/jornadas/${id}/documentos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${camila.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "briefing_projeto" }),
    })
  ).json()) as { id: number };

  await entrarComo(page, "paulo.nunes");
  await page.goto(`/jornadas/${id}?documento=${doc.id}`);
  const painel = documentoAberto(page);
  await expect(painel.getByRole("heading", { name: /Briefing de projeto · v1/ })).toBeVisible();
  await expect(painel.getByRole("button", { name: "Exportar .md" })).toBeVisible();
  await expect(painel.getByRole("button", { name: "Editar" })).toHaveCount(0);
  await expect(painel.getByRole("button", { name: /Aprovar/ })).toBeDisabled();
  await expect(painel.getByText("Só o gerente designado para este lead decide neste ponto.")).toBeVisible();
});

test("a API recusa o G4 do analista mesmo sem botão", async ({ request }) => {
  // invariante 3: quem barra é o serviço
  const id = await idDoLead("Rede Folha");
  const lucas = await entrarNaApi("lucas.prado");
  const historico = await (await request.get(`${URL_API}/jornadas/${id}/documentos`, { headers: { Authorization: `Bearer ${lucas.token}` } })).json();
  const briefing = historico.documentos.find((d: { tipo: string }) => d.tipo === "briefing_projeto");
  const resposta = await request.post(`${URL_API}/documentos/${briefing.id}/aprovar`, {
    headers: { Authorization: `Bearer ${lucas.token}` },
  });
  expect(resposta.status()).toBe(403);
});

test("o analista não aprova o briefing comercial com número que não está nos itens", async ({ page }) => {
  const id = await idDoLead("Mercado Pátio"); // VALIDADA, da Marina
  await entrarComo(page, "marina.costa");
  await page.goto(`/jornadas/${id}`);
  await page.getByRole("button", { name: "Gerar resumo comercial" }).click();
  const painel = documentoAberto(page);
  await expect(painel.getByRole("heading", { name: /Resumo comercial · v1/ })).toBeVisible();
  await painel.getByRole("button", { name: "Editar" }).click();
  const campo = painel.getByLabel("Texto do documento (markdown)");
  await campo.fill(`${await campo.inputValue()}\nValor total de R$ 98.765.\n`);
  await painel.getByRole("button", { name: "Salvar" }).click();
  await expect(alerta(page)).toContainText("não existe nos itens validados");
});

test("Rafael leva a Clínica Vitalis do aceite à jornada concluída", async ({ page }) => {
  const id = await idDoLead("Clínica Vitalis"); // HANDOFF_ENVIADO, gerente Rafael
  await entrarComo(page, "rafael.lima");
  await page.goto(`/jornadas/${id}`);

  await page.getByRole("button", { name: "Aceitar handoff" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("checkbox").check();
  await modal.getByRole("button", { name: /^Aceitar v\d+$/ }).click();

  await page.getByRole("button", { name: "Gerar briefing de projeto" }).click();
  const painel = documentoAberto(page);
  await expect(painel.getByRole("heading", { name: /Briefing de projeto · v1/ })).toBeVisible();
  // parágrafo → evidência a um clique
  const paragrafo = painel.getByRole("button", { name: /.+/ }).filter({ has: page.locator("span") }).first();
  await paragrafo.click();
  await expect(painel.locator("blockquote").first()).toBeVisible();

  await painel.getByRole("button", { name: "Aprovar briefing (G4)" }).click();
  await expect(page.getByRole("heading", { name: "Pauta de kickoff", level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Concluir jornada" })).toBeDisabled();
  await expect(page.getByText("Aprove a pauta de kickoff antes de concluir.")).toBeVisible();

  await page.getByRole("button", { name: "Gerar pauta de kickoff" }).click();
  await expect(documentoAberto(page).getByRole("heading", { name: /Pauta de kickoff · v1/ })).toBeVisible();
  await documentoAberto(page).getByRole("button", { name: "Aprovar documento" }).click();
  await page.getByRole("button", { name: "Concluir jornada" }).click();
  await expect(page.getByRole("button", { name: "Concluir jornada" })).toHaveCount(0);
  await expect(page.getByText("Concluída").first()).toBeVisible();
});
