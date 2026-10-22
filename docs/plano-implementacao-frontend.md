# Plano de Implementação do Front-end 

> **Estado em:** 22/10/2026
>
> **Entrega Alvo:** 22/10/2026 (Meta Interna)
>
> **Base de Referência:** Mocks da pasta `/telas`, `docs/requisitos-enxutos.docx`, `docs/user-stories.docx` e API Back-end (Fases 0 a 4).



## 0. Estado (conciliação com a branch `feature/frontend-telas-auth-kanban-reuniao-lead`)

Branch `feature/frontend-conciliado`, a partir desta (`feature/frontend-telas`). Base é esta branch; entram o visual e as funções da outra.

**Feito e conferido** (tsc e lint limpos no container; telas renderizadas no Edge headless, logadas por perfil):
- **Login:** entrada em **1 clique** nos cards do Modo demonstração (`POST /auth/demo`, sem preencher e-mail); layout sem borda rasgada, só faixas discretas. Testado: clique em "Gerente de projetos" entrou como `rafael.lima` e foi a `/kanban/geral`.
- **Cadastro e menu lateral:** sem borda rasgada (`marca/recorte.ts` removido). Menu de 240 px como no mock.
- **Kanban (analista e geral):** colunas cinza-azuladas, cards compactos com contorno e hover (destaque do fundo), títulos das colunas sem corte. **Atualização automática** (`lib/useLeitura.ts`): 5 s com card "Extraindo…", 30 s no resto, só com a aba visível; rodapé "Atualizado às HH:MM:SS".
- **Cabeçalho:** busca rápida (`GET /busca`, a partir de 2 letras), sino de notificações (`GET /notificacoes` a cada 30 s; abrir marca como lidas) e migalha "Kanban › Página do lead" nas páginas de lead.
- Selects dos filtros com sombra e borda azul no hover.

- **Histórico** (`/historico`, `components/historico/TabelaHistorico.tsx`): lista de leads concluídos a partir de `GET /kanban?concluidas=true`, com filtro por analista (gerente/técnico), estado vazio e atualização a cada 60 s. Testado no navegador: a gerente designada e o analista dono veem o lead concluído; outro analista vê o estado vazio (isolamento da carteira); "Abrir lead" leva à página do lead. Para ver a tela com dados, o lead "Padaria Trigal" foi concluído pela API (pauta de kickoff gerada e aprovada pela gerente); o seed não tem lead concluído e o reseed desfaz isso.

- **Próximo passo + "Tentar de novo"** (`components/jornada/PainelProximoPasso.tsx`, na coluna lateral da página do lead): em `TRANSCRICAO_RECEBIDA`/`EXTRAINDO` mostra "Extraindo a ficha" (a página pode ser fechada); em `FALHA_EXTRACAO` mostra "A extração falhou · Sua transcrição está preservada" e o botão "Tentar de novo" (`POST /jornadas/{id}/extracao/tentar-novamente`) para o analista dono e o gerente; a API confere o resto. A página do lead passou a usar `lib/useLeitura.ts`: atualiza a cada 5 s durante a extração e a cada 30 s no resto, só com a aba visível. Este painel é o ponto de encaixe das próximas ações (G2, G4). Testado no navegador: lead em falha → botão → "Extraindo a ficha" → o painel some sozinho quando o worker termina, sem recarregar. Risco não executado: `tentar_extracao_de_novo` usa `jornada.reunioes[-1]`, que falharia num lead em `FALHA_EXTRACAO` sem nenhuma reunião; esse estado não deve ocorrer no fluxo normal (a falha vem de uma reunião cadastrada).

**Correção (22/10):** a página do lead **não** foi portada da outra branch e isso foi um erro de avaliação. A outra tem o que esta não tem: ação "Tentar de novo" na falha de extração, "Aprovar validação" (G2) e atualização automática enquanto a extração roda. Aqui o card do kanban manda "abrir o lead e tentar de novo", mas a página não tem o botão (beco sem saída).

**Lacunas contra `docs/requisitos-enxutos.docx` e `docs/user-stories.docx`** (o back tem o endpoint em todos os casos; falta a tela):

| Prioridade | Lacuna | Histórias / capacidades | Endpoint pronto |
| --- | --- | --- | --- |
| 1 | ~~"Tentar de novo" na falha de extração e polling da página do lead durante a extração~~ **feito** (ver abaixo) | C4, C5 | `POST /jornadas/{id}/extracao/tentar-novamente` |
| 1 | Revisão G2: itens ao lado da evidência; confirmar, editar, rejeitar, adicionar; seletor de natureza | C6, C7, C8 (cap. 5) | `GET/POST /jornadas/{id}/itens`, `PATCH /itens/{id}` |
| 1 | Pendências: Informar / Esclarecido / Aceitar com risco + justificativa; lista com link no bloqueio do G2 | C9 (cap. 4) | `GET /jornadas/{id}/pendencias`, `POST /pendencias/{id}/resolver` |
| 1 | Botão "Aprovar validação" (G2) com o motivo escrito | C10 | `POST /jornadas/{id}/validar` |
| 1 | Documentos: gerar, editar, aprovar, exportar .md, parágrafos clicáveis até a evidência, bloqueio por número inventado | C11, G5, G6 (cap. 6 e 10) | `POST /jornadas/{id}/documentos`, `PUT/GET /documentos/{id}`, `/aprovar`, `/exportar` |
| 1 | G4: gerente revisa e aprova o briefing; concluir a jornada | G5, G6 | `POST /documentos/{id}/aprovar`, `POST /jornadas/{id}/concluir` |
| 2 | Fila do gerente (pacotes designados, versão, completude, pendências) | G1 | `GET /handoffs` |
| 2 | Faixa com o comentário do gerente quando devolve o pacote | tabela de bloqueios | já vem no detalhe do lead (conferir) |
| 2 | Perfil técnico: não há usuário técnico no seed nem no Modo demonstração; telas de briefing/pauta só leitura | T1, T2 | `GET /documentos/{id}` |
| 2 | "Recarregar demonstração" na Diretoria | A2 | `POST /demo/recarregar` |
| 3 | Ver o texto da reunião (aba Reuniões só lista metadados) | cap. 11 | `GET /reunioes/{id}` |
| 3 | Pacotes: histórico de versões e prévia das 16 seções antes de enviar | C12 | `GET /jornadas/{id}/pacotes`, `GET /pacotes/{id}` |
| 3 | Auditoria global na Diretoria; painel de IA (Should) | A3 | `GET /auditoria` |

Sem 1 (G2, pendências, documentos, G4) a demonstração ponta a ponta pela interface para em "Em validação": o analista não consegue validar nem avançar. Hoje só dá para percorrer o fluxo pela API (`/docs`).
- Não verificado: troca de perfil pelo seletor do menu, abrir notificações e busca com resultado na interface (só renderização e o fluxo de login). A aprovação de gates (G3) também não foi clicada.
- **Cache do Next no Windows:** o bind mount não dispara recompilação de arquivos já compilados. Se uma edição não aparecer, rode `docker compose exec frontend sh -c 'rm -rf .next/*'` e `docker compose restart frontend`.
- **Testes e2e (Playwright)** em `e2e/` (projeto próprio; `make e2e` ou `cd e2e && E2E_NAVEGADOR=msedge npx playwright test`; a stack precisa estar no ar). Conferem o DOM, não imagem. **31 passam e 1 está `fixme`** (rodado em 22/10 contra o docker, no Edge): login em 1 clique por perfil e erros, kanban por papel (carteira, colunas, bloqueantes, filtros), Histórico por papel, página do lead (gate G3 por papel com motivo escrito, 403 da API sem botão, G2 com contagem de bloqueantes, evidência a um clique, dado mascarado, lead de outro analista) e "Tentar de novo" (atualização automática e sem itens duplicados). A suíte recarrega a demonstração (`POST /demo/recarregar`) e acha os leads pelo nome, porque os ids mudam. Guia de uso em `.claude/skills/testar-com-playwright/`. **`fixme`:** o seletor de perfil do menu não lista o técnico. Ainda sem e2e: cadastro de conta, cadastro de reunião, Diretoria (usuários, convite) e troca de perfil no menu.
- `tsc` e `eslint` rodam no container (`docker compose exec -T frontend npx tsc --noEmit` e `npm run lint`); no host o `eslint` não existe.

## 1. Mapeamento de Telas Prototipadas vs. Rotas e Endpoints

A tabela abaixo conecta diretamente os protótipos visuais aos seus respectivos caminhos de navegação no front-end, perfis de acesso autorizados e rotas da API back-end:

| Protótipo em `/telas` | Rota Front-end | Perfil Principal | Componentes Chave da Interface | Endpoints do Back-end | 
| ----- | ----- | ----- | ----- | ----- | 
| `01-cadastro-de-conta 1.png` | `/cadastro` | Público | Formulário de cadastro, validação de senha (mínimo 10 caracteres com letras e números), checkbox de LGPD e link direto para login. | `POST /auth/cadastro` | 
| `02-login 1.jpg` | `/login` | Todos | Login padrão por e-mail/senha, link de recuperação de senha (desabilitado para MVP) e painel **Modo demonstração** com atalhos de perfil. | `POST /auth/login`  `POST /auth/renovar` | 
| `03-interface-diretoria 1.jpg` | `/diretoria` | Diretoria (`DR`) | Header de filtros globais, 4 cards de métricas do funil, gráfico "Funil por etapa", gerenciamento de usuários e matriz visual de permissões com aviso de trava. | `GET /painel/funil`  `GET /permissoes`  `GET /usuarios`  `POST /usuarios/convidar`  `PATCH /usuarios/{id}` | 
| `04-kanban-geral 1.jpg` | `/kanban/geral` | Gerente (`RL`) | Banner de escopo ("Você vê todos os leads"), filtros por analista e negócio, 6 colunas do funil e cards com percentual de completude e badge de pendências. | `GET /kanban` | 
| `04b-kanban-visao-analista 1.png` | `/kanban/meus-leads` | Analista (`MC`) | Banner de restrição ("Você vê apenas os seus leads"), botão em destaque **+ Cadastrar reunião** e cards restritos à carteira do analista. | `GET /kanban` (a API restringe pelo papel) | 
| `05-cadastro-de-reuniao 1.jpg` | `/reunioes/cadastrar` | Analista / Gerente | Toggle "Lead existente / Novo lead", form de metadados e participantes, área de upload/texto (limite de 15k palavras), sidebar de resumo e checklist de obrigatórios (7/7). | `GET /reunioes/opcoes`  `POST /reunioes/pre-visualizar`  `POST /reunioes` | 
| `06-pagina-individual-do-lead 1.jpg` | `/jornadas/{id}` | Todos (Ações por papel) | Stepper de 7 estados da jornada, abas de navegação, visão geral com chips de natureza/origem, histórico de documentação, widget de Handoff com Gate G3 e auditoria. | `GET /jornadas/{id}`  `GET /jornadas/{id}/visao-geral`  `GET /jornadas/{id}/documentos`  `GET /jornadas/{id}/auditoria`  `GET /jornadas/{id}/reunioes`  `GET /itens/{id}/evidencia`  `POST /jornadas/{id}/handoff`  `POST /jornadas/{id}/handoff/aceitar`  `POST /jornadas/{id}/handoff/devolver` | 



## 2. Arquitetura de Componentes

A estrutura de código do front-end é modularizada para promover o reuso de componentes de layout, regras de negócio e elementos visuais da marca:

```
src/
├── components/
│   ├── layout/
│   │   ├── SidebarNav.tsx           # Menu lateral dinâmico baseado no perfil ativo (Analista, Gerente, Diretoria)
│   │   ├── HeaderBreadcrumb.tsx     # Barra superior com navegação por migalhas, busca rápida e avatar
│   │   └── SwitchModoDemo.tsx       # Dropdown fixo no rodapé para alternância instantânea de papel de teste
│   ├── kanban/
│   │   ├── CardLead.tsx             # Card do Kanban com progresso em barra, contagem de reuniões e alertas
│   │   └── FiltrosKanban.tsx        # Seletores de filtro (analista, tipo de negócio, filtro de bloqueantes)
│   ├── jornada/
│   │   ├── StepperEstados.tsx       # Barra superior de linha do tempo com os 7 estados da jornada
│   │   ├── ChipNatureza.tsx         # Badges identificadores: Acordado, Em discussão, Sugestão da IA, Não informado
│   │   ├── PainelHandoffGate.tsx    # Card lateral com resumo do pacote imutável e botões do Gate G3
│   │   └── LinhaDoTempoAudit.tsx    # Feed cronológico exibindo alterações, autor e data/hora
│   └── reuniao/
│       ├── CheckListObrigatorios.tsx # Indicador visual do cumprimento dos 7 campos obrigatórios de cadastro
│       └── UploadTranscricao.tsx    # Componente de captura de arquivo/texto com validação de limite e mascaramento

```


## 3. Cronograma 

```
[22/10 - Quinta]  ──► Shell, Auth, Modo Demo, Ingestão, Kanban Dual, Página do Lead, Gate G3, Diretoria e validação.

```

### Quinta-feira (22/10) — Shell, Autenticação, Ingestão, Kanban Dual, Página do Lead, Diretoria e Validação E2E.

* **Autenticação e Shell Base (`01` e `02`):**

  * Implementação das rotas `/cadastro` e `/login` seguindo a identidade visual (escuro/verde institucional).

  * Construção do bloco de seleção **Modo demonstração** no login para entrada rápida como Marina Costa (Analista), Rafael Lima (Gerente) ou Diretoria.

  * Configuração da `SidebarNav.tsx` com atalho de troca rápida de papel no rodapé (`SwitchModoDemo.tsx`).

* **Cadastro e Pré-visualização de Reunião (`05`):**

  * Formulário de 3 etapas com alternância entre "Lead existente" e "Novo lead".

  * Integração com `POST /reunioes/pre-visualizar` para feedback dinâmico de palavra/segmento e alerta de mascaramento de dados sensíveis.

  * Sidebar reativa de validação contendo o checklist dos 7 campos obrigatórios.

* **Kanban Adaptável por Perfil (`04` e `04b`):**

  * **Visão Analista**: Exibição restrita dos leads próprios, banner indicativo ("5 de 22") e botão de ação em destaque **+ Cadastrar reunião**.

  * **Visão Gerente**: Exibição global da carteira ("22 leads"), suporte a filtro por analistas e checkbox de pendências bloqueantes.

  * Renderização das 6 colunas do funil e cards com barras de progresso percentual.

* **Página da Jornada e Gate G3 (`06`)** 

  * Stepper com os 7 estados e destaque na etapa atual.

  * Blocos de escopo e requisitos enriquecidos com os `ChipNatureza.tsx`.

  * Histórico com listagem das versões dos documentos (resumos, briefings e pacotes).

  * Painel lateral de Handoff com execução do Gate G3: botões "Aceitar handoff" e "Devolver ao analista" (integrados a `POST /jornadas/{id}/handoff/aceitar` e `/handoff/devolver`).

* **Painel da Diretoria e Governança (`03`)** 

  * Visão geral com métricas superiores, gráfico de distribuição do funil e tabela de projetos.

  * Gerenciamento de usuários e exibição da matriz de permissões por perfil.

  * Aplicação da trava explícita: o perfil Diretoria gerencia o sistema, mas não aprova etapas ou gates em nome dos operacionais.



## 3.1 Estado da implementação

### Já existe — Autenticação e Shell Base (`01` e `02`)

Verificado com `tsc --noEmit`, `npm run lint` e `npm run build` (todas as rotas pré-renderizadas como estáticas). **Não testado no navegador nem contra a API rodando**; não há testes automatizados de front.

* **Sessão:** `lib/auth/AuthContext.tsx` guarda `{token, usuario, demo}` no `localStorage` (`ponte.sessao`) via `useSyncExternalStore` (sincroniza abas), renova o token por `POST /auth/renovar` a cada 30 min e encerra a sessão em caso de 401. `lib/auth/guardas.ts`: `useRedirecionarSeLogado` (telas públicas) e `useExigirSessao` (grupo `(app)`), que manda para o login quem não tem sessão e para a rota inicial do papel quem abre uma rota de outro papel. É só conveniência: quem barra é a API.
* **Cliente HTTP:** `lib/api.ts` (`requisitar` + `apiAuth`) lê `NEXT_PUBLIC_API_URL`, envia o Bearer e transforma `{detail, codigo}` em `ErroApi` com a mensagem do back. `NEXT_PUBLIC_EMAIL_DOMINIO` (padrão `seedabit.org.br`) só orienta o formulário.
* **`/cadastro`:** validação nativa espelhando `usuarios.cadastrar_conta` (nome, domínio do e-mail, senha com 10+ caracteres, letras e números, confirmação, LGPD). O erro da API aparece em alerta. A conta entra como analista e é redirecionada.
* **`/login`:** e-mail e senha; "Esqueci a senha" desabilitado com o motivo no `title`. **Modo demonstração** carregado de `GET /auth/demo`; a seção some quando a API responde 404 (`DEMO_MODE` desligado). *Decisão:* clicar no perfil **seleciona e preenche** o e-mail (a senha fica desabilitada) e o botão "Entrar como …" confirma via `POST /auth/demo`. Digitar outro e-mail desfaz a seleção.
* **Shell `(app)`:** `SidebarNav` com menu por papel (`lib/rotas.ts`, espelhando as telas 03/04/04b), `SwitchModoDemo` no rodapé (troca o papel na hora só em sessão de demonstração; fora dela mostra o perfil fixo), `HeaderBreadcrumb` e botão Sair. Rota inicial: analista → `/kanban/meus-leads`, gerente e técnico → `/kanban/geral`, Diretoria → `/diretoria`.
* **Páginas provisórias** (`EmConstrucao`): `/kanban/meus-leads`, `/kanban/geral`, `/diretoria`, `/diretoria/usuarios`, `/historico` e `/jornadas/[id]` (destino após cadastrar reunião; `export const instant = false` porque o layout `(app)` lê `usePathname` fora de `<Suspense>`).
* **Identidade:** tokens de cor no `@theme` de `globals.css` (marinho, lima, azul), Inter via `next/font`, borda recortada por `clip-path` com semente fixa (`components/marca/recorte.ts`) e ícones em SVG inline (`components/icones.tsx`), sem novas dependências.

### Já existe — Cadastro e pré-visualização de reunião (`05`)

Verificado com `tsc --noEmit`, `npm run lint` e `npm run build`. **Não testado no navegador nem contra a API rodando.**

* **Rota:** `/reunioes/cadastrar` (grupo `(app)`), para analista e gerente; o breadcrumb passou a mostrar "Kanban de leads › Cadastrar reunião" nas páginas internas.
* **Dados:** `GET /reunioes/opcoes` (leads e tipos) e `GET /usuarios/opcoes` (filtrado para analistas) em paralelo; `apiReunioes` em `lib/api.ts`. `requisitar` agora aceita `FormData` (multipart, sem `Content-Type` manual).
* **1. Lead e negócio:** alternância "Lead existente / Novo lead". Leads que não aceitam reunião (já enviados ao gerente) aparecem desabilitados; sem lead aberto, a tela abre em "Novo lead". Escolher o lead preenche o nome do negócio (editável).
* **2. Dados da reunião:** analista travado com o motivo escrito (analista só cadastra para si; lead existente fixa o analista do lead, como exige a API). Data padrão = hoje; tipos com rótulos (`exploratoria` → "Exploratória (1ª reunião)"). Participantes em chips com inclusão inline e marcação "do cliente"; o analista logado entra por padrão.
* **3. Transcrição:** "Enviar arquivo" (.txt/.md/.vtt/.srt) ou "Colar texto". *Decisão:* `POST /reunioes/pre-visualizar` roda automaticamente ao escolher o arquivo e com debounce de 800 ms ao colar; respostas antigas são descartadas por contador. O cartão mostra palavras, segmentos, limite, "Formato válido" e quantos dados pessoais serão mascarados; o erro da API aparece no lugar.
* **Checklist 7/7** derivado do estado (transcrição só conta com pré-visualização válida). "Cadastrar e processar" fica desabilitado com o motivo escrito abaixo; o envio vai em multipart para `POST /reunioes` e redireciona para `/jornadas/{id}`.
* **Componentes novos:** `formulario/CampoSelecao`, `formulario/GrupoAlternancia`, `reuniao/UploadTranscricao`, `reuniao/CheckListObrigatorios`, `reuniao/CampoParticipantes`, `reuniao/PainelLateralReuniao`; `CampoTexto` ganhou o tom `sobreBranco`. Formulário com `useState`, sem nova dependência.

### Já existe — Kanban adaptável por perfil (`04` e `04b`)

Verificado com `tsc --noEmit`, `npm run lint` e `npm run build`. **Não testado no navegador nem contra a API rodando.**

* **Rotas:** `/kanban/geral` (gerente, técnico, Diretoria) e `/kanban/meus-leads` (analista) usam o mesmo `kanban/QuadroKanban`, que adapta a visão pelo papel da sessão. Quem restringe a carteira é a API (`_consulta_visivel`); o front só ajusta os filtros.
* **Dados:** `GET /kanban` com `analista_id`, `negocio_id` e `so_bloqueantes` (`apiKanban.listar`); o banner de escopo usa o `aviso` devolvido pela API ("Você vê todos os leads (22)…" / "…(5 de 22)…"). Filtro de negócios vem de `GET /reunioes/opcoes`; o de analistas, de `GET /usuarios/opcoes` filtrado para `comercial`. Trocar filtro refaz a consulta e descarta respostas antigas.
* **Visão do analista:** no lugar do filtro de analistas aparece "Meus leads" travado (com o motivo no `title`) e o botão **+ Cadastrar reunião**. Gerente/Diretoria: "Todos os analistas" + lista.
* **Colunas e cards:** as 6 etapas vêm da API ("Concluída" fica no histórico); coluna vazia mostra "Nenhum lead". Card com cliente, negócio, iniciais e primeiro nome do analista, nº de reuniões, chip lima "N bloq." (e borda lima), chips "Extraindo…" / "Falha na extração" e barra de completude (azul até a validação, verde depois). Clicar abre `/jornadas/{id}`. Em telas menores que `xl` o quadro rola na horizontal dentro do shell.
* **Componentes novos:** `kanban/QuadroKanban`, `kanban/ColunaKanban`, `kanban/CardLead`, `kanban/FiltrosKanban`; tipos `CardLead`, `ColunaKanban`, `RespostaKanban`, `FiltrosKanban`, `EtapaKanban` em `lib/tipos.ts`.
* *Decisão:* cores pelos tokens do `@theme` (tirados das telas), não por hex novos.

### Já existe — Página da jornada e Gate G3 (`06`)

Verificado com `tsc --noEmit`, `npm run lint` e `npm run build`. **Não testado no navegador nem contra a API rodando.**

* **Rota:** `/jornadas/[id]` (server) valida o id e renderiza `jornada/PaginaJornada` (cliente), que carrega em paralelo `GET /jornadas/{id}`, `/visao-geral`, `/auditoria`, `/reunioes` e `/documentos`, e recarrega tudo depois de cada decisão.
* **`HeaderJornada`:** cliente, negócio, "lead desde", chip da etapa atual, chips "Extraindo…" / "Falha na extração" e de dados pessoais mascarados (soma das reuniões), faixa de devolução com o comentário do gerente, stepper das 7 etapas (vindas da API) e os 4 cartões (gerente, analista, reuniões, completude).
* **Abas:** Visão geral (requisitos + histórico de documentação), Histórico de documentação, Reuniões (transcrições recebidas) e Auditoria (feed completo, com recusas em vermelho).
* **`TabelaRequisitosG3`:** as 16 seções com `ChipNatureza` (Acordado, Em discussão, Sugestão da IA, Não informado) e `ChipOrigem` (Inferido/Manual). Clicar no item abre a evidência (`GET /itens/{id}/evidencia`) logo abaixo; sem trecho, avisa que é inferido.
* **`PainelHandoffGate` (G3):** versão, "Snapshot imutável · só nova versão altera", acordados/em discussão/bloqueantes, seções N de 16 e o que falta. Gerente e Diretoria veem "Aceitar handoff" e "Devolver ao analista" com a jornada em `HANDOFF_ENVIADO`; os botões ficam desabilitados com o motivo devolvido pela API em `gates.G3` (Diretoria sempre recebe "Só o gerente designado…") e a Diretoria vê a trava fixa "Perfil Diretoria não aprova nada por outra pessoa". Analista responsável, com a jornada `VALIDADA`, escolhe o gerente e envia o handoff (`POST /jornadas/{id}/handoff`); nos demais estados vê o status em leitura.
* **`ModalDecisaoGateG3`:** aceitar exige marcar que conferiu a versão vN e envia essa versão (a API recusa se houver outra mais nova); devolver exige comentário. Erro da API aparece no modal. Esc e clique fora fecham.
* **`LinhaTempoJornada`:** últimos 5 eventos no painel lateral (auditoria traduzida: "Enviou handoff v2", "Aprovou a validação (G2)"…); `ListaReunioes` na aba Reuniões.
* *Decisões:* o pedido original citava `gate-g3/aprovar`, `src/@types` e aprovação pela Diretoria; seguimos o contrato real (`handoff/aceitar|devolver`, `lib/tipos.ts`) e o invariante de que a Diretoria não aprova. O aceite **não** leva observação: `AceiteIn` só tem `versao`, então não há campo de justificativa que seria descartado. "Nível de confiança" da IA não existe no back; a tela mostra natureza + origem + evidência. Cores pelos tokens do `@theme`, não por hex novos.

### Já existe — Painel da Diretoria e governança (`03`)

Verificado com `tsc --noEmit`, `npm run lint` e `npm run build`. **Não testado no navegador nem contra a API rodando.**

* **Rotas:** `/diretoria` (`diretoria/PainelDiretoria`) e `/diretoria/usuarios` (página própria com a tabela completa e a matriz). `EmConstrucao` saiu das duas.
* **Filtros:** período (7/30/90 dias ou todo o período → `dias=0`), analista e gerente (de `GET /usuarios/opcoes`). Trocar filtro refaz `GET /painel/funil` e descarta respostas antigas. Usuários e matriz não dependem dos filtros.
* **`CartoesMetricas`:** os 4 KPIs da API (leads no funil, em validação, handoffs aguardando aceite, pendências bloqueantes) com o filete lima da tela.
* **`GraficoFunil`:** *decisão:* barras horizontais em CSS (sem biblioteca), largura proporcional à maior etapa, última etapa em lima. **`ListaProjetos`:** primeiros 5 leads ativos com gerente e chip da etapa; clicar abre `/jornadas/{id}`, "Ver todos" vai ao kanban geral.
* **`TabelaUsuarios`** (autônoma, `GET /usuarios`): iniciais, nome, e-mail, select de perfil que salva na hora (`PATCH /usuarios/{id}`) com o erro da API na própria linha (ex.: "A Diretoria precisa de ao menos uma conta ativa."), chip de status. No painel mostra 5 linhas e link para a página completa, que acrescenta Desativar/Reativar. **`ModalConvidarUsuario`:** nome, e-mail institucional e perfil → `POST /usuarios/convidar`; botão desabilitado com o motivo escrito.
* **`MatrizPermissoes`:** somente leitura, de `GET /permissoes` (derivada de `permissoes.MATRIZ`, a mesma dos gates), com a trava "Perfil Diretoria não aprova nada por outra pessoa." vinda da API.
* `Selecao` do kanban virou `formulario/SelecaoFiltro` (reusada nos filtros da Diretoria).
* *Decisões:* o plano citava `GET /painel`, `GET|POST /admin/usuarios` e `GET /auditoria`; seguimos o contrato real da API. A auditoria global (`GET /auditoria`) não aparece na tela 03 e ficou de fora. Status `convidado` aparece como "Convite pendente" (a tela diz "Convidada", que não serve para todos). Busca e sino de notificações do header não foram feitos (header compartilhado; mesma pendência do kanban). Uso de IA (`ia` no painel) é devolvido pela API mas não está na tela.

### Riscos e pendências

* Token em `localStorage` fica exposto a XSS. Foi aceito para o MVP; a alternativa seria cookie httpOnly via proxy do Next.
* `CORS_ORIGENS` do back precisa incluir a origem do front (padrão `http://localhost:3000`).
* Falta conferir a fidelidade visual das telas 01 e 02 no navegador e o fluxo ponta a ponta com o seed (`python -m app.seed`).
* O perfil técnico não tem tela própria; usa o kanban geral em leitura.
* Cadastro de reunião: falta conferir no navegador contra a API (upload multipart, CORS com `Authorization`) e a fidelidade visual da tela 05. A pré-visualização envia o arquivo inteiro a cada troca; aceitável no limite de 15 mil palavras.
* O botão "Cancelar" descarta o formulário sem confirmação.
* Kanban: a busca do header ("Buscar lead, negócio…" das telas 04/04b) ainda não existe; a API já aceita `q` em `GET /kanban` e há `GET /busca`. Sem atualização automática: um card em "Extraindo…" só muda ao recarregar ou trocar filtro.
* Página do lead: o breadcrumb ainda mostra "Kanban de leads" sem o nome do cliente (o header não conhece a jornada). Não há tela de revisão G2 (itens ao lado da evidência, pendências) nem de briefing/pauta (G4); o analista em `EM_VALIDACAO` só vê o motivo do G2. Documentos do histórico ainda não abrem.
* Diretoria: trocar o próprio perfil é aceito pela API (só barra a última conta da Diretoria); a sessão passa a receber 403 nas telas da Diretoria até sair e entrar de novo. Convite não envia e-mail (o back só cria a conta pendente).
* Kanban: o filtro de negócios lista só leads não concluídos (`/reunioes/opcoes`), o que basta porque o quadro não mostra concluídos.

## 4. Regras Visuais e Trava de Invariantes

1. **Restrição de Ação da Diretoria:** A interface da Diretoria deve apresentar o alerta visual fixo: *"Perfil Diretoria não aprova nada por outra pessoa"*, desabilitando botões de aprovação de gates.

2. **Isolamento de Carteira:** Analistas de negócios só visualizam seus próprios leads no Kanban. Apenas Gerentes e Diretoria possuem permissão para alternar a visualização para todos os analistas.

3. **Rastreabilidade Visual:** Requisitos ou itens propostos pela IA que não possuam evidência direta na transcrição devem exibir obrigatoriamente os selos **Sugestão da IA**.

4. **Imutabilidade do Handoff:** O painel de aceite do pacote de handoff deve indicar claramente o número da versão e a marcação de *"Snapshot imutável · só nova versão altera"*.
