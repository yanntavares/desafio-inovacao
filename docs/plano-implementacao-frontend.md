# Plano de Implementação do Front-end 

> **Estado em:** 22/10/2026
>
> **Entrega Alvo:** 22/10/2026 (Meta Interna)
>
> **Base de Referência:** Mocks da pasta `/telas`, `docs/requisitos-enxutos.docx`, `docs/user-stories.docx` e API Back-end (Fases 0 a 4).



## 1. Mapeamento de Telas Prototipadas vs. Rotas e Endpoints

A tabela abaixo conecta diretamente os protótipos visuais aos seus respectivos caminhos de navegação no front-end, perfis de acesso autorizados e rotas da API back-end:

| Protótipo em `/telas` | Rota Front-end | Perfil Principal | Componentes Chave da Interface | Endpoints do Back-end | 
| ----- | ----- | ----- | ----- | ----- | 
| `01-cadastro-de-conta 1.png` | `/cadastro` | Público | Formulário de cadastro, validação de senha (mínimo 10 caracteres com letras e números), checkbox de LGPD e link direto para login. | `POST /auth/cadastro` | 
| `02-login 1.jpg` | `/login` | Todos | Login padrão por e-mail/senha, link de recuperação de senha (desabilitado para MVP) e painel **Modo demonstração** com atalhos de perfil. | `POST /auth/login`  `POST /auth/renovar` | 
| `03-interface-diretoria 1.jpg` | `/diretoria` | Diretoria (`DR`) | Header de filtros globais, 4 cards de métricas do funil, gráfico "Funil por etapa", gerenciamento de usuários e matriz visual de permissões com aviso de trava. | `GET /painel`  `GET /admin/usuarios`  `POST /admin/usuarios`  `GET /auditoria` | 
| `04-kanban-geral 1.jpg` | `/kanban/geral` | Gerente (`RL`) | Banner de escopo ("Você vê todos os leads"), filtros por analista e negócio, 6 colunas do funil e cards com percentual de completude e badge de pendências. | `GET /kanban` | 
| `04b-kanban-visao-analista 1.png` | `/kanban/meus-leads` | Analista (`MC`) | Banner de restrição ("Você vê apenas os seus leads"), botão em destaque **+ Cadastrar reunião** e cards restritos à carteira do analista. | `GET /kanban` (a API restringe pelo papel) | 
| `05-cadastro-de-reuniao 1.jpg` | `/reunioes/cadastrar` | Analista / Gerente | Toggle "Lead existente / Novo lead", form de metadados e participantes, área de upload/texto (limite de 15k palavras), sidebar de resumo e checklist de obrigatórios (7/7). | `GET /reunioes/opcoes`  `POST /reunioes/pre-visualizar`  `POST /reunioes` | 
| `06-pagina-individual-do-lead 1.jpg` | `/jornadas/{id}` | Todos (Ações por papel) | Stepper de 7 estados da jornada, abas de navegação, visão geral com chips de natureza/origem, histórico de documentação, widget de Handoff com Gate G3 e auditoria. | `GET /jornadas/{id}`  `GET /jornadas/{id}/documentos`  `GET /jornadas/{id}/pacote`  `POST /jornadas/{id}/aceitar-pacote`  `POST /jornadas/{id}/devolver-pacote` | 



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

  * Painel lateral de Handoff com execução do Gate G3: botões "Aceitar handoff" e "Devolver ao analista" (integrados a `POST /jornadas/{id}/aceitar-pacote` e `devolver-pacote`).

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

### Riscos e pendências

* Token em `localStorage` fica exposto a XSS. Foi aceito para o MVP; a alternativa seria cookie httpOnly via proxy do Next.
* `CORS_ORIGENS` do back precisa incluir a origem do front (padrão `http://localhost:3000`).
* Falta conferir a fidelidade visual das telas 01 e 02 no navegador e o fluxo ponta a ponta com o seed (`python -m app.seed`).
* O perfil técnico não tem tela própria; usa o kanban geral em leitura.
* Cadastro de reunião: falta conferir no navegador contra a API (upload multipart, CORS com `Authorization`) e a fidelidade visual da tela 05. A pré-visualização envia o arquivo inteiro a cada troca; aceitável no limite de 15 mil palavras.
* O botão "Cancelar" descarta o formulário sem confirmação.
* Kanban: a busca do header ("Buscar lead, negócio…" das telas 04/04b) ainda não existe; a API já aceita `q` em `GET /kanban` e há `GET /busca`. Sem atualização automática: um card em "Extraindo…" só muda ao recarregar ou trocar filtro.
* Kanban: o filtro de negócios lista só leads não concluídos (`/reunioes/opcoes`), o que basta porque o quadro não mostra concluídos.

## 4. Regras Visuais e Trava de Invariantes

1. **Restrição de Ação da Diretoria:** A interface da Diretoria deve apresentar o alerta visual fixo: *"Perfil Diretoria não aprova nada por outra pessoa"*, desabilitando botões de aprovação de gates.

2. **Isolamento de Carteira:** Analistas de negócios só visualizam seus próprios leads no Kanban. Apenas Gerentes e Diretoria possuem permissão para alternar a visualização para todos os analistas.

3. **Rastreabilidade Visual:** Requisitos ou itens propostos pela IA que não possuam evidência direta na transcrição devem exibir obrigatoriamente os selos **Sugestão da IA**.

4. **Imutabilidade do Handoff:** O painel de aceite do pacote de handoff deve indicar claramente o número da versão e a marcação de *"Snapshot imutável · só nova versão altera"*.
