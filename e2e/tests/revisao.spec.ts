import { expect, type Page, test } from "@playwright/test";
import { URL_API } from "../playwright.config";
import { entrarNaApi, idDoLead, itensDoLead, recarregarDemonstracao } from "../support/api";
import { alerta } from "../support/dom";
import { entrarComo } from "../support/sessao";

// Vários testes alteram os itens do Instituto Horizonte: a demonstração volta ao seed no fim.
test.afterAll(async () => {
  await recarregarDemonstracao();
});

const PROBLEMA = /O problema é que os alunos não conseguem rever as aulas gravadas/;
const OBJETIVO = /O objetivo é aumentar a retenção dos alunos/;
const PUBLICO = /Queremos uma plataforma de cursos online/;
const ESCOPO = /Também precisamos de uma área do professor/;

async function abrirRevisao(page: Page, quem: string, cliente: string): Promise<number> {
  const id = await idDoLead(cliente, quem);
  await entrarComo(page, quem);
  await page.goto(`/jornadas/${id}/revisao`);
  await expect(page.getByRole("heading", { name: "Revisão dos itens", level: 1 })).toBeVisible();
  return id;
}

const item = (page: Page, texto: RegExp) => page.getByRole("button", { name: texto });
const painelDoItem = (page: Page) => page.getByRole("group", { name: "Revisar item" });

test.describe("analista dono revisa a ficha (G2)", () => {
  test("os itens vêm agrupados por seção e o trecho da transcrição abre ao lado, destacado", async ({ page }) => {
    await abrirRevisao(page, "marina.costa", "Instituto Horizonte");
    await expect(page.getByRole("region", { name: "Problema" }).getByRole("button", { name: PROBLEMA })).toBeVisible();
    await expect(page.getByRole("region", { name: "Objetivo" }).getByRole("button", { name: OBJETIVO })).toBeVisible();

    const transcricao = page.getByRole("complementary", { name: "Trecho da transcrição" });
    await expect(transcricao).toContainText("Selecione um item");
    await item(page, PROBLEMA).click();
    await expect(item(page, PROBLEMA)).toHaveAttribute("aria-expanded", "true");
    await expect(transcricao.getByRole("list", { name: "Transcrição da reunião" })).toBeVisible();
    await expect(transcricao.locator("mark").first()).toContainText("rever as aulas gravadas");
    await expect(transcricao.locator('li[aria-current="true"]').first()).toContainText("Helena:");
    await item(page, PROBLEMA).click(); // segundo clique fecha
    await expect(transcricao).toContainText("Selecione um item");
  });

  test("confirmar exige escolher a natureza: a IA não decide", async ({ page }) => {
    const id = await abrirRevisao(page, "marina.costa", "Instituto Horizonte");
    // item pendente mostra a proposta da IA como tal, e não como natureza decidida
    await expect(page.getByRole("region", { name: "Problema" })).toContainText("IA propõe: Acordado");
    await item(page, PROBLEMA).click();
    const painel = painelDoItem(page);
    await expect(painel).toContainText("A IA propôs:");
    await expect(painel.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    await expect(painel.getByText("Escolha a natureza do item: a IA não decide.")).toBeVisible();
    // nenhuma natureza vem marcada, nem a que a IA propôs
    await expect(painel.getByRole("radio", { checked: true })).toHaveCount(0);

    await painel.getByRole("radio", { name: "Acordado" }).check();
    await expect(painel.getByRole("button", { name: "Confirmar" })).toBeEnabled();
    await painel.getByRole("button", { name: "Confirmar" }).click();

    await expect(page.getByRole("region", { name: "Problema" })).toContainText("Confirmado");
    await expect(page.getByRole("region", { name: "Problema" })).not.toContainText("IA propõe");
    await expect(page.getByRole("button", { name: /Confirmados \(1\)/ })).toBeVisible();
    const salvo = (await itensDoLead(id, "marina.costa")).find((i) => PROBLEMA.test(i.descricao));
    expect(salvo).toMatchObject({ status_validacao: "confirmado", natureza_final: "acordado" });
  });

  test("editar troca o texto e deixa o item Editado", async ({ page }) => {
    const id = await abrirRevisao(page, "marina.costa", "Instituto Horizonte");
    await item(page, OBJETIVO).click();
    await painelDoItem(page).getByRole("button", { name: "Editar" }).click();
    const painel = painelDoItem(page);
    await expect(painel.getByRole("button", { name: "Salvar edição" })).toBeDisabled(); // falta a natureza
    await painel.getByLabel("Texto do item").fill("O objetivo é reduzir a evasão dos alunos.");
    await painel.getByRole("radio", { name: "Em discussão" }).check();
    await painel.getByRole("button", { name: "Salvar edição" }).click();

    const secao = page.getByRole("region", { name: "Objetivo" });
    await expect(secao).toContainText("O objetivo é reduzir a evasão dos alunos.");
    await expect(secao).toContainText("Editado");
    const salvo = (await itensDoLead(id, "marina.costa")).find((i) => i.descricao.includes("reduzir a evasão"));
    expect(salvo).toMatchObject({ status_validacao: "editado", natureza_final: "em_discussao" });
  });

  test("rejeitar marca o item como rejeitado e o filtro o encontra", async ({ page }) => {
    await abrirRevisao(page, "marina.costa", "Instituto Horizonte");
    await item(page, ESCOPO).click();
    await painelDoItem(page).getByRole("button", { name: "Rejeitar" }).click(); // rejeitar não pede natureza
    await expect(page.getByRole("region", { name: "Escopo" })).toContainText("Rejeitado");
    await page.getByRole("button", { name: /Rejeitados \(/ }).click();
    await expect(item(page, ESCOPO)).toBeVisible();
    await expect(item(page, PUBLICO)).toHaveCount(0);
  });

  test("adicionar item: entra como manual, confirmado e sem evidência", async ({ page }) => {
    const id = await abrirRevisao(page, "marina.costa", "Instituto Horizonte");
    await page.getByRole("button", { name: "Adicionar item" }).click();
    const form = page.getByRole("region", { name: "Adicionar item" });
    await expect(form.getByRole("button", { name: "Adicionar", exact: true })).toBeDisabled();
    await expect(form.getByText("Escolha a seção.")).toBeVisible();

    await form.getByLabel("Seção").selectOption({ label: "Riscos" });
    await form.getByLabel("Descrição").fill("Equipe do cliente indisponível em dezembro.");
    await form.getByLabel("Natureza").selectOption({ label: "Em discussão" });
    await form.getByRole("button", { name: "Adicionar", exact: true }).click();

    const novo = page.getByRole("region", { name: "Riscos" }).getByRole("button", { name: /Equipe do cliente indisponível/ });
    await expect(novo).toBeVisible();
    await expect(novo).toContainText("Manual");
    await expect(novo).toContainText("Confirmado");
    await expect(novo).toContainText("Sem evidência");
    await novo.click();
    await expect(page.getByRole("complementary", { name: "Trecho da transcrição" })).toContainText("Sem trecho na transcrição");
    const salvo = (await itensDoLead(id, "marina.costa")).find((i) => i.descricao.includes("indisponível em dezembro"));
    expect(salvo).toMatchObject({ origem: "manual", status_validacao: "confirmado", natureza_final: "em_discussao" });
  });

  test("a página do lead leva à revisão", async ({ page }) => {
    const id = await idDoLead("Instituto Horizonte", "marina.costa");
    await entrarComo(page, "marina.costa");
    await page.goto(`/jornadas/${id}`);
    await expect(page.getByRole("heading", { name: "Validação da ficha (G2)" })).toBeVisible();
    await page.getByRole("link", { name: "Revisar itens" }).click();
    await expect(page).toHaveURL(new RegExp(`/jornadas/${id}/revisao$`));
  });
});

test.describe("quem não pode revisar só lê, com o motivo escrito, e a API recusa", () => {
  test("outro gerente vê os itens, sem botões, e a API devolve 403", async ({ page, request }) => {
    const id = await abrirRevisao(page, "camila.reis", "Instituto Horizonte");
    await expect(page.getByText("Somente leitura. Só o analista responsável por este lead revisa os itens.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar item" })).toHaveCount(0);
    await item(page, PROBLEMA).click();
    await expect(painelDoItem(page)).toContainText("Só o analista responsável por este lead revisa os itens.");
    await expect(page.getByRole("button", { name: "Confirmar" })).toHaveCount(0);

    const camila = await entrarNaApi("camila.reis");
    const itemId = (await itensDoLead(id, "camila.reis"))[0].id;
    const resposta = await request.patch(`${URL_API}/itens/${itemId}`, {
      headers: { Authorization: `Bearer ${camila.token}` },
      data: { acao: "rejeitar" },
    });
    expect(resposta.status()).toBe(403);
  });

  test("o técnico lê, mas a API recusa qualquer revisão", async ({ page, request }) => {
    const id = await abrirRevisao(page, "paulo.nunes", "Instituto Horizonte");
    await expect(page.getByText(/Somente leitura\./)).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar item" })).toHaveCount(0);

    const paulo = await entrarNaApi("paulo.nunes");
    const itemId = (await itensDoLead(id, "paulo.nunes"))[0].id;
    const resposta = await request.patch(`${URL_API}/itens/${itemId}`, {
      headers: { Authorization: `Bearer ${paulo.token}` },
      data: { acao: "rejeitar" },
    });
    expect(resposta.status()).toBe(403);
  });

  test("fora de 'Em validação' os itens ficam travados e a API devolve 409", async ({ page, request }) => {
    const id = await abrirRevisao(page, "marina.costa", "Clínica Vitalis"); // handoff já enviado
    await expect(page.getByText("Somente leitura. Os itens só podem ser alterados com a jornada em validação.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar item" })).toHaveCount(0);

    const marina = await entrarNaApi("marina.costa");
    const itemId = (await itensDoLead(id, "marina.costa"))[0].id;
    const resposta = await request.patch(`${URL_API}/itens/${itemId}`, {
      headers: { Authorization: `Bearer ${marina.token}` },
      data: { acao: "rejeitar" },
    });
    expect(resposta.status()).toBe(409);
  });

  test("o lead de outro analista não abre a revisão", async ({ page }) => {
    const id = await idDoLead("Instituto Horizonte", "marina.costa");
    await entrarComo(page, "lucas.prado");
    await page.goto(`/jornadas/${id}/revisao`);
    await expect(alerta(page)).toBeVisible();
    await expect(page.getByRole("button", { name: PROBLEMA })).toHaveCount(0);
  });
});
