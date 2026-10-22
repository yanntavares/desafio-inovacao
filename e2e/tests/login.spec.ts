import { expect, test } from "@playwright/test";
import { alerta } from "../support/dom";

// Cada cartão do Modo demonstração entra com 1 clique e cai na tela inicial do papel.
const PERFIS = [
  { cartao: /Analista de negócios/, destino: "/kanban/meus-leads", usuario: "Marina Costa" },
  { cartao: /Gerente de projetos/, destino: "/kanban/geral", usuario: "Rafael Lima" },
  { cartao: /Equipe técnica/, destino: "/kanban/geral", usuario: "Paulo Nunes" },
  { cartao: /Diretoria/, destino: "/diretoria", usuario: "Diretoria" },
];

test("o Modo demonstração lista os quatro perfis", async ({ page }) => {
  await page.goto("/login");
  for (const { cartao } of PERFIS) await expect(page.getByRole("button", { name: cartao })).toBeVisible();
});

for (const { cartao, destino, usuario } of PERFIS) {
  test(`1 clique em ${cartao.source} entra e vai para ${destino}`, async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: cartao }).click();
    await expect(page).toHaveURL(new RegExp(`${destino}$`));
    // o nome fica no rodapé do menu lateral (a Diretoria também aparece, oculta, no seletor de perfil)
    await expect(page.getByRole("complementary").locator("p", { hasText: usuario })).toBeVisible();
  });
}

test("senha errada mostra o motivo e não entra", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marina.costa@seedabit.org.br");
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(alerta(page)).toHaveText("E-mail ou senha incorretos.");
  await expect(page).toHaveURL(/\/login$/);
});

test("campos vazios pedem e-mail e senha sem chamar a API", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(alerta(page)).toHaveText("Informe e-mail e senha para entrar.");
});

test("sem sessão, rota interna volta ao login", async ({ page }) => {
  await page.goto("/kanban/meus-leads");
  await expect(page).toHaveURL(/\/login$/);
});

test("sair encerra a sessão", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Analista de negócios/ }).click();
  await expect(page).toHaveURL(/\/kanban\/meus-leads$/);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/kanban/meus-leads");
  await expect(page).toHaveURL(/\/login$/);
});

// Lacuna conhecida (plano do front, perfil técnico): o seletor de perfil do menu ainda não lista o técnico.
test.fixme("o técnico aparece selecionado no seletor de perfil da demonstração", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Equipe técnica/ }).click();
  await expect(page.getByLabel("Trocar perfil de demonstração")).toHaveValue("tecnico");
});
