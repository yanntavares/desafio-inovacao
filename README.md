# Handoff Comercial → Projetos

MVP: transcrição → dados validados → pacote de handoff → briefing de projeto → pauta de kickoff.
Back em Python (FastAPI + PostgreSQL), front em TypeScript (a iniciar com as telas).

## Subir

```bash
make up          # copia .env.example para .env e sobe db + api + worker
```

Ou, sem make: `cp .env.example .env && docker compose up --build`

- API: http://localhost:8000 (documentação em `/docs`, saúde em `/health`)
- O serviço `api` roda `alembic upgrade head` antes de iniciar.
- Front em outra porta ou domínio: inclua a origem em `CORS_ORIGENS` no `.env` (padrão `http://localhost:3000`), senão o navegador barra as chamadas à API.
- `LLM_PROVIDER=mock` por padrão: nenhuma chamada paga de IA. Para usar o Claude: `LLM_PROVIDER=anthropic` e `ANTHROPIC_API_KEY` no `.env` (modelo em `LLM_MODELO`, padrão `claude-sonnet-5-5`); depois `docker compose up -d api worker` para recarregar.

## Comandos

| Comando | O que faz |
| --- | --- |
| `make test` | roda os testes do backend em SQLite (`uv sync --extra dev` em `backend/` antes) |
| `make test-pg` | roda os mesmos testes no PostgreSQL do compose (banco `handoff_teste`); se já houver um Postgres local na 5432, defina `DB_PORT=5433` no `.env` |
| `make e2e` | testes do front no navegador (Playwright) contra a stack no ar; na primeira vez baixa o Chromium da versão certa. `E2E_NAVEGADOR=chrome make e2e` usa o Chrome instalado, sem download |
| `make migrate` | aplica as migrações no container |
| `make revision m="texto"` | gera nova migração a partir dos models |
| `make logs` | acompanha api e worker |

## Estrutura

```
handoff/
├── docker-compose.yml
├── .env.example
├── Makefile
├── .github/workflows/ci.yml      segredos, lint, testes (PostgreSQL) e build do front
├── docs/
│   ├── requisitos-enxutos.docx   requisitos do MVP
│   ├── user-stories.docx         histórias por papel
│   ├── plano-implementacao-backend.md  o que foi feito e o que falta
│   └── telas/                    7 telas de referência
├── frontend/                     Next.js + TypeScript
└── backend/
    ├── Dockerfile
    ├── pyproject.toml
    ├── alembic/                  migrações (0001 = schema inicial)
    ├── app/
    │   ├── main.py               cria o FastAPI e registra os routers
    │   ├── worker.py             consome a fila de jobs no PostgreSQL
    │   ├── core/                 config (.env) e acesso ao banco
    │   ├── models/               10 tabelas, um arquivo por assunto + enums.py
    │   ├── api/                  routers HTTP (sem regra de negócio)
    │   ├── schemas/              contratos Pydantic (API e saída da IA)
    │   ├── services/             regras: orquestrador, gates, auditoria, pacote
    │   ├── llm/                  LLMProvider (Claude + mock) e prompts/ versionados
    │   └── seed/                 dados de demonstração (python -m app.seed)
    └── tests/
        ├── api/                  fluxo, telas, invariantes, segurança
        ├── models/
        ├── test_llm_anthropic.py provider com cliente falso (sem chamada paga)
        └── test_worker.py        dois workers e SKIP LOCKED (só PostgreSQL)
```

Regra de dependência: `api` e `worker` chamam `services`; `services` usam `models` e `llm`;
nada em `models` conhece as camadas acima.

## Tabelas (10)

`usuario`, `jornada`, `reuniao`, `item`, `pendencia`, `documento`, `pacote_handoff`,
`aprovacao`, `job` (fila + registro de chamadas de IA), `auditoria`.
Segmentos, máscaras, evidências e vínculos documento→item são colunas JSON
(detalhes em `backend/app/models/__init__.py`).

## Demonstração

```bash
make up
docker compose exec api python -m app.seed   # 9 leads fictícios em todas as etapas
```

Com `DEMO_MODE=true`, a tela de login oferece os perfis de demonstração (`GET/POST /auth/demo`);
pelo login normal, a senha de todos é `demonstracao1`:

| Perfil | Conta | Vê |
| --- | --- | --- |
| Analista de negócios | `marina.costa@seedabit.org.br` (e `lucas.prado`) | só os próprios leads |
| Gerente de projetos | `rafael.lima@seedabit.org.br` (e `camila.reis`) | todos os leads |
| Diretoria | `diretoria@seedabit.org.br` | todos; gerencia usuários, não aprova |

Roteiro sugerido, todo pela interface e com os cards do Modo demonstração (o card "Gerente" entra
como Rafael):

1. **Analista · Instituto Horizonte** (em validação): G2 bloqueado com o motivo; a natureza do item
   começa vazia ("a IA não decide"); evidência a um clique; "Aceitar com risco" pede justificativa.
2. **Analista · Mercado Pátio** (validado): gerar o resumo comercial, clicar num parágrafo até o
   trecho da transcrição, tentar incluir um valor que não está nos itens (a API recusa) e enviar
   o handoff ao Rafael.
3. **Gerente · Clínica Vitalis** (handoff aguardando o Rafael), do começo ao fim: aceitar a versão
   do pacote (G3) → gerar e aprovar o briefing de projeto (G4) → gerar e aprovar a pauta de kickoff
   → concluir. O lead sai do kanban e aparece em Histórico.
4. **Equipe técnica**: abrir o briefing pelo Histórico; só lê e exporta.
5. **Diretoria**: funil, usuários e matriz com a trava "não aprova nada por outra pessoa";
   "Recarregar demonstração" volta tudo ao início para o próximo ensaio.

## Endpoints

Referência completa e interativa em `http://localhost:8000/docs`. Por grupo:

| Grupo | Endpoints |
| --- | --- |
| Auth | `POST /auth/cadastro`, `POST /auth/login`, `POST /auth/renovar`, `GET /auth/me`, `GET/POST /auth/demo` |
| Leads e kanban | `GET /kanban`, `GET /busca`, `GET /projetos`, `GET /handoffs`, `GET /jornadas/{id}` (+ `/visao-geral`, `/auditoria`, `/gates`) |
| Reuniões | `GET /reunioes/opcoes`, `POST /reunioes/pre-visualizar`, `POST /reunioes`, `GET /reunioes/{id}`, `GET /jornadas/{id}/reunioes`, `POST /jornadas/{id}/extracao/tentar-novamente` |
| Itens e pendências | `GET/POST /jornadas/{id}/itens`, `PATCH /itens/{id}`, `GET /itens/{id}/evidencia`, `GET /jornadas/{id}/pendencias`, `GET /pendencias/minhas`, `POST /pendencias/{id}/resolver` |
| Gates e handoff | `POST /jornadas/{id}/validar` (G2), `POST /jornadas/{id}/handoff`, `GET /jornadas/{id}/pacotes`, `GET /pacotes/{id}`, `POST /jornadas/{id}/handoff/aceitar` (G3) e `/devolver` |
| Documentos | `GET/POST /jornadas/{id}/documentos`, `GET/PUT /documentos/{id}`, `POST /documentos/{id}/aprovar` (G4 no briefing de projeto), `GET /documentos/{id}/exportar`, `POST /jornadas/{id}/concluir` |
| Diretoria | `GET /usuarios`, `GET /usuarios/opcoes`, `POST /usuarios/convidar`, `PATCH /usuarios/{id}`, `GET /permissoes`, `GET /painel/funil`, `GET /auditoria`, `POST /demo/recarregar` |
| Notificações | `GET /notificacoes`, `POST /notificacoes/lidas` |

Erros de regra voltam como `{detail, codigo}` em português (403 por papel, 409 por estado/gate,
429 no login bloqueado, 502 de falha da IA).

## Segurança

- Fora do modo demo a API **não sobe** com `JWT_SECRET=troque-isto` ou com menos de 32 caracteres
  (`openssl rand -hex 32`). `DEMO_MODE` nunca deve ficar ligado em produção.
- Token expira em `JWT_EXPIRA_MINUTOS` (480); o front renova com `POST /auth/renovar`.
- Login bloqueia por 15 minutos após 5 senhas erradas na mesma conta (`LOGIN_MAX_TENTATIVAS`,
  `LOGIN_JANELA_MINUTOS`); cada falha fica na auditoria.
- Toda tentativa recusada (403/409) também vai para a auditoria.
- Só texto mascarado (e-mail, telefone, CPF, CNPJ) vai ao provedor de IA; logs do SDK ficam em WARNING.
- O CI roda varredura de segredos (gitleaks), lint, testes no PostgreSQL e o build do front.

## Situação e próximos passos

Back e front cobrem a fatia ponta a ponta pela interface, do cadastro de reunião à jornada
concluída (roteiro acima). O estado, as decisões e os riscos em aberto estão em
`docs/plano-implementacao-backend.md` e `docs/plano-implementacao-frontend.md`. Pendente: rodar
com a chave real da Anthropic e medir custo e latência.
