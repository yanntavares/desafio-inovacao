import { expect, test } from "@playwright/test";
import { recarregarDemonstracao } from "../support/api";
import { entrarComo } from "../support/sessao";

// Cria um lead novo: parte do seed e o devolve intacto para os outros specs.
test.describe.configure({ mode: "serial" });
test.beforeAll(recarregarDemonstracao);
test.afterAll(recarregarDemonstracao);

// Transcrição fictícia, com um e-mail para conferir o mascaramento antes de ir à IA.
const TRANSCRICAO = `Bruno: Queremos um aplicativo para agendar aulas de música.
Ana: Os alunos marcam pelo celular e recebem lembrete.
Bruno: Pode mandar a proposta para bruno@exemplo.com.br.`;

test("cadastrar reunião de lead novo: mascara o dado pessoal, fecha o checklist e abre o lead", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/reunioes/cadastrar");
  const enviar = page.getByRole("button", { name: "Cadastrar e processar" });
  await expect(enviar).toBeDisabled();
  await expect(page.locator("#motivo-bloqueio")).toBeVisible();

  await page.getByRole("radio", { name: "Novo lead" }).click();
  await page.getByLabel("Nome do lead *").fill("Escola Sinfonia");
  await page.getByLabel("Nome do negócio *").fill("App de agendamento de aulas");
  await page.getByLabel("Tipo da reunião *").selectOption({ index: 1 });
  await page.getByRole("radio", { name: "Colar texto" }).click();
  await page.getByLabel("Texto da transcrição").fill(TRANSCRICAO);

  await expect(page.getByText("1 dado pessoal será mascarado")).toBeVisible();
  await expect(page.getByRole("region", { name: "Campos obrigatórios" }).getByText("7 de 7")).toBeVisible();
  await expect(enviar).toBeEnabled();
  await enviar.click();
  await expect(page).toHaveURL(/\/jornadas\/\d+$/);
  await expect(page.getByRole("heading", { name: "Escola Sinfonia", level: 1 })).toBeVisible();
});

test("Cancelar com algo digitado pede confirmação e não sai se a pessoa desistir", async ({ page }) => {
  await entrarComo(page, "marina.costa");
  await page.goto("/reunioes/cadastrar");
  await page.getByRole("radio", { name: "Novo lead" }).click();
  await page.getByLabel("Nome do lead *").fill("Rascunho qualquer");
  let pergunta = "";
  page.once("dialog", (d) => {
    pergunta = d.message();
    void d.dismiss();
  });
  await page.getByRole("button", { name: "Cancelar" }).click();
  expect(pergunta).toContain("Descartar o que foi preenchido");
  await expect(page).toHaveURL(/\/reunioes\/cadastrar$/);
});
