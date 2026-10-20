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
- `LLM_PROVIDER=mock` por padrão: nenhuma chamada paga de IA.

## Comandos

| Comando | O que faz |
| --- | --- |
| `make test` | roda os testes do backend (`pip install -e "backend[dev]"` antes) |
| `make migrate` | aplica as migrações no container |
| `make revision m="texto"` | gera nova migração a partir dos models |
| `make logs` | acompanha api e worker |

## Estrutura

```
handoff/
├── docker-compose.yml
├── .env.example
├── Makefile
├── docs/
│   ├── requisitos-enxutos.docx   requisitos do MVP
│   ├── user-stories.docx         histórias por papel
│   └── telas/                    telas do projeto (colocar aqui)
├── frontend/                     React + TypeScript (a iniciar)
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
    │   ├── llm/                  LLMProvider (real + mock) e prompts/ versionados
    │   └── seed/                 dados de demonstração
    └── tests/
        ├── api/
        └── models/
```

Regra de dependência: `api` e `worker` chamam `services`; `services` usam `models` e `llm`;
nada em `models` conhece as camadas acima.

## Tabelas (10)

`usuario`, `jornada`, `reuniao`, `item`, `pendencia`, `documento`, `pacote_handoff`,
`aprovacao`, `job` (fila + registro de chamadas de IA), `auditoria`.
Segmentos, máscaras, evidências e vínculos documento→item são colunas JSON
(detalhes em `backend/app/models/__init__.py`).

## Próximos passos

1. Orquestrador de estados + gates G2/G3/G4 em `services/`, com auditoria na mesma transação
2. Papéis e teste de 403 por papel × endpoint
3. Entrada da transcrição (parsing, segmentação, mascaramento)
4. `LLMProvider` com mock + worker de extração
5. Front, assim que as telas chegarem
