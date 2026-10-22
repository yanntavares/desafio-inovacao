---
name: testar-com-playwright
description: Testa o front do Handoff Comercial → Projetos no navegador com Playwright, conferindo o DOM (papéis, textos, URL, botões desabilitados, aria) em vez de tirar print. Use sempre que for validar uma tela, um fluxo ou uma regra de permissão no front, escrever ou rodar testes e2e, confirmar que uma mudança "funciona na tela", ou antes de dar trabalho de front como pronto, mesmo que o pedido seja só "confere se está funcionando", "testa a tela X" ou "roda os testes". Também vale para reproduzir bug de interface, testar gates (G2, G3, G4) por papel e checar atualização automática.
---

# Testar o front com Playwright

Os testes ficam em `e2e/` (projeto próprio, não mexe no `package.json` do front) e conferem **o que a tela diz e permite**, não como ela parece. Tirar print para "ver se está certo" é lento, depende de interpretação e não roda no CI; um `expect` falha sozinho e aponta a linha. Imagem só entra como evidência de falha (o Playwright já salva uma em `test-results/`).

## Rodar

A stack precisa estar de pé (`make up`; front em :3000, API em :8000). Os testes **recarregam a demonstração** antes de começar, então partem sempre do mesmo seed.

```bash
cd e2e
npm install                                   # primeira vez
E2E_NAVEGADOR=msedge npx playwright test      # Windows: usa o Edge instalado, sem baixar navegador
npx playwright test tests/kanban.spec.ts      # um arquivo
npx playwright test -g "Tentar de novo"       # por nome
npx playwright show-trace test-results/<pasta>/trace.zip   # depois de uma falha
```

Sem `E2E_NAVEGADOR`, o Playwright usa o Chromium dele (`npx playwright install chromium` se faltar). Se a API ou o front não responderem, o setup para com a mensagem do que subir.

## O que já existe em `e2e/support/`

| Helper | Para quê |
| --- | --- |
| `entrarComo(page, "marina.costa")` | Abre o app já logado (login pela API + sessão no `localStorage`). Use no começo de quase todo teste; o login pela tela tem teste próprio em `login.spec.ts`. |
| `idDoLead("Clínica Vitalis")` | Id do lead pelo nome. **Os ids mudam a cada reset da demonstração**, o nome do cliente não: nunca fixe `/jornadas/7`. |
| `alerta(page)` | Alertas do app. Não use `getByRole("alert")` puro: o Next tem um `role="alert"` vazio para anunciar rotas e o modo estrito quebra com 2 elementos. |
| `simularFalhaDeExtracao(id)` | Monta no banco um estado que a API não cria. Ao simular, reproduza o estado **real**: uma extração que falha não deixa itens nem pendências (a primeira versão deixava e o teste "viu" itens duplicados que não existem). |
| `contarItens`, `recarregarDemonstracao`, `entrarNaApi` | Conferir efeitos pela API e limpar depois de testes que alteram o banco (`test.afterAll`). |

Contas do seed (senha de todas: `demonstracao1`): `marina.costa` e `lucas.prado` (analistas), `rafael.lima` e `camila.reis` (gerentes), `paulo.nunes` (técnico, só leitura), `diretoria`. Rafael é o gerente designado de Clínica Vitalis; Camila, de Rede Folha e Padaria Trigal. Leads do seed: Studio Nômade, ONG Maré Viva, Escola Aurora (sem reunião), Instituto Horizonte e Café Bonanza (em validação), Mercado Pátio (validada), Clínica Vitalis (handoff enviado), Rede Folha (aceito), Padaria Trigal (briefing aprovado), Ateliê Vento Sul (concluído).

## Como escrever um teste

- **Localize como o usuário:** `getByRole("button", { name: ... })`, `getByRole("row")`, `getByLabel`, `getByText`. Só use `locator("css")` quando não houver papel acessível (ex.: `blockquote`). Se faltar papel ou nome acessível na tela, isso é um achado de acessibilidade: melhore o componente em vez de usar seletor frágil.
- **Espere por estado, nunca por tempo:** use `expect(...)` (que repete até passar) e nunca `waitForTimeout`. Para telas que se atualizam sozinhas (polling de 5 s na extração, 30 s no resto), dê `timeout` maior que o intervalo: `toHaveCount(0, { timeout: 40_000 })`.
- **Um comportamento por teste, nome em português** dizendo o que a pessoa vê ou não pode fazer.
- **Permissão se testa em dois níveis** (invariante 3 do projeto: o gate vive na API): na tela, o botão some ou fica desabilitado **com o motivo escrito**; e, pela API (`request`), a ação é recusada com 403 mesmo sem botão. Veja `jornada.spec.ts`.
- **Cubra por papel:** o mesmo lead vira outra tela para analista dono, outro analista, gerente designado, outro gerente e técnico. Escolha os papéis que mudam o resultado.
- Testes que alteram o banco recarregam a demonstração no `afterAll`. A suíte roda com 1 worker porque todos dividem o mesmo banco.
- Lacuna conhecida da tela entra como `test.fixme("...")` com o motivo no comentário, para o teste já existir quando a tela for corrigida.

## Fluxo ao implementar ou mudar uma tela

1. Escreva (ou atualize) o spec junto com a tela, em `e2e/tests/<assunto>.spec.ts`, cobrindo o caminho feliz, o bloqueio com motivo e o isolamento por papel.
2. Rode o arquivo e depois a suíte inteira: uma tela mexe em componentes compartilhados (menu, cabeçalho, kanban).
3. Se falhar, abra o trace antes de mexer em qualquer coisa e decida **de quem é o erro**. Já aconteceram os dois: seletor ambíguo e simulação irreal eram defeito do teste; um botão sem nome acessível é defeito da tela.
4. Registre no plano do front (`docs/plano-implementacao-frontend.md`) o que foi coberto e o que ficou de fora. Diga o que não rodou.

## Armadilhas neste ambiente (Windows + docker)

- Editou um componente e a tela não mudou? O Next dentro do container serve cache velho: `docker compose exec frontend sh -c 'rm -rf .next/*'` e `docker compose restart frontend`, e espere uns 30 s.
- No Git Bash, argumentos como `/kanban/geral` viram caminho do Windows. Use `MSYS_NO_PATHCONV=1` ao chamar scripts de linha de comando; dentro dos specs isso não ocorre.
- `eslint` e `tsc` do front rodam **no container** (`docker compose exec -T frontend npx tsc --noEmit` e `npm run lint`); no host, `npm run lint` imprime `> eslint` e parece passar sem rodar.
- O teste que força falha usa `docker compose exec db psql`, então precisa do Docker acessível a partir do `e2e/`.
