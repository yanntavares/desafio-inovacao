# Plano de Implementação do Front-end 

> **Estado em:** 21/10/2026
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
| `04b-kanban-visao-analista 1.png` | `/kanban/meus-leads` | Analista (`MC`) | Banner de restrição ("Você vê apenas os seus leads"), botão em destaque **+ Cadastrar reunião** e cards restritos à carteira do analista. | `GET /kanban?meus_leads=true` | 
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



## 4. Regras Visuais e Trava de Invariantes

1. **Restrição de Ação da Diretoria:** A interface da Diretoria deve apresentar o alerta visual fixo: *"Perfil Diretoria não aprova nada por outra pessoa"*, desabilitando botões de aprovação de gates.

2. **Isolamento de Carteira:** Analistas de negócios só visualizam seus próprios leads no Kanban. Apenas Gerentes e Diretoria possuem permissão para alternar a visualização para todos os analistas.

3. **Rastreabilidade Visual:** Requisitos ou itens propostos pela IA que não possuam evidência direta na transcrição devem exibir obrigatoriamente os selos **Sugestão da IA**.

4. **Imutabilidade do Handoff:** O painel de aceite do pacote de handoff deve indicar claramente o número da versão e a marcação de *"Snapshot imutável · só nova versão altera"*.
