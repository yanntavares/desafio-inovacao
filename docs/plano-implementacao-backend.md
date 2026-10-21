# Plano de implementação do back-end

Estado em 20/10/2026 (congelamento de escopo). Entrega: 23/10, meta interna 18h.
Base: branch `feature/implementação-base-back`. Referências: `CLAUDE.md`, `docs/telas/`, `docs/requisitos-enxutos.docx`, `docs/user-stories.docx`.

## 1. O que já existe

Tudo abaixo roda e tem teste em SQLite (23 testes, `make test`). Nada foi executado contra PostgreSQL.

| Capacidade | Onde | Situação |
| --- | --- | --- |
| Conta, login JWT, perfis, modo demonstração, convite | `services/usuarios.py`, `api/auth.py`, `api/admin.py` | Feito |
| Matriz papel × ação, 403 com mensagem | `services/permissoes.py` | Feito, 11 combinações testadas (analista e gerente cadastram reunião) |
| Orquestrador de estados, G2/G3/G4, motivo de bloqueio | `services/orquestrador.py` | Feito |
| Transcrição: .txt/.md/.vtt/.srt, segmentação, mascaramento, limite de 15 mil palavras | `services/transcricao.py` | Feito |
| Extração com evidência literal, reparos, idempotência, worker | `services/extracao.py`, `worker.py`, `llm/` | Feito **só com o mock** |
| Pendências pela matriz de obrigatórios | `services/pendencias.py`, `services/matriz.py` | Feito |
| Revisão de itens (confirmar, editar, rejeitar, adicionar) | `services/itens.py` | Feito |
| Kanban por perfil, detalhe do lead, funil, auditoria | `services/jornadas.py`, `services/painel.py` | Feito |
| Pacote de handoff (16 seções, hash, versões, aceite, devolução) | `services/pacote.py` | Feito |
| Documentos versionados, conferência de números, G4, conclusão | `services/documentos.py` | Feito com o mock |
| Seed de demonstração (9 leads em todas as etapas) | `seed/__init__.py` | Feito |

## 2. O que falta, em ordem

### Fase 0 — Provar em PostgreSQL (primeiro, antes de qualquer feature)

Bloqueia tudo: só o SQLite foi exercitado.

1. Subir `make up` e rodar `python -m app.seed` no container. Corrigir o que o PostgreSQL recusar (enums nativos compartilhados, JSON, `Date`).
2. Migração: ninguém tem banco criado, então a `0001` (que usa `create_all`) continua sendo editada no lugar. Passar a gerar revisões (`make revision`) só depois da primeira entrega.
3. Teste do worker com PostgreSQL: dois workers, `SKIP LOCKED`, nenhum job processado duas vezes.
4. Rodar a suíte contra o banco do compose (serviço `db` de teste ou marcador `pytest -m postgres`), mantendo SQLite para o ciclo rápido.

Pronto quando: `make up` + seed + `make test` passam, e um lead anda de `CRIADA` a `CONCLUIDA` pelo worker real.

### Fase 1 — Lacunas dos invariantes (testes que ainda não existem)

O código existe; falta o teste que o `CLAUDE.md` exige para cada invariante.

- Extração com saída inválida: até 2 reparos e depois `FALHA_EXTRACAO` (usar um provider falso que devolve JSON quebrado).
- "Tentar de novo" não duplica itens (mesma chave de idempotência).
- Item sem trecho literal vira `inferida` e perde as evidências.
- Injeção na transcrição: texto com "ignore as instruções" não altera itens nem estado.
- Transições inválidas (tabela completa de `TRANSICOES`) e G4 com gerente errado.
- Quem valida não aceita o próprio handoff, com o mesmo usuário nos dois papéis.
- Tentativa recusada (403/409) também vai para a auditoria — hoje só a ação bem-sucedida é gravada.

### Fase 2 — Provedor de IA real

Decisão em aberto dos requisitos: Claude ou OpenAI, atrás de `LLMProvider`.

1. Teste comparativo nas 3 transcrições fictícias (precisão da evidência, taxa de reparo, custo, latência). Usar a skill `claude-api` e os IDs de modelo atuais.
2. Implementar o provider escolhido em `llm/`: prompt com a transcrição delimitada por `<transcricao>`, sem ferramentas com efeito colateral, `LLM_MAX_TOKENS` aplicado de fato (hoje só existe na config).
3. Registrar tokens, latência e custo por chamada no `job` (colunas já existem) e expor custo por jornada.
4. Mover a redação de documentos para job assíncrono se a latência passar de poucos segundos (hoje roda dentro da requisição).
5. Garantir que nenhum log grave texto da transcrição.

### Fase 3 — O que as telas pedem e ainda não tem endpoint

| Tela | Falta |
| --- | --- |
| Login | "Esqueci a senha" (fluxo de redefinição) |
| Topbar | Notificações (sino): devolução do gerente, novo handoff, pendência nova. Busca global de lead e usuário (hoje só `q` no kanban) |
| Cadastro de reunião | Lista de leads existentes do analista e dos negócios para os selects; validação prévia dos 7 campos obrigatórios |
| Gerente | Menu "Projetos" (leads de `ACEITO` em diante) e "Histórico" próprios |
| Lead | Resumo gerencial (`resumo_gerencial` existe como tipo, mas nada o gera) |
| Diretoria | Reenviar convite; filtros de auditoria por período |

Decidido: o gerente também cadastra reunião (escolhe o analista responsável). A Diretoria não.

### Fase 4 — Segurança e operação

- Recusar subir fora do modo demo com `JWT_SECRET=troque-isto`.
- Limite de tentativas no login e expiração/renovação de token.
- Varredura de segredos no CI e CI rodando `make test` (RNF-03).
- `README.md`: atualizar estrutura, endpoints e o fluxo de demonstração.

### Fase 5 — Should, só se sobrar tempo

Reprocessar com diff (RF-07), pendências geradas por IA (RF-09), comentários por item (RF-21), viabilidade por requisito (RF-23), pontos de atenção da pauta (RF-25), painel de operações de IA (RF-32), dossiê vivo (RF-34/35, condicional), exportar PDF/DOCX.

## 3. Cronograma sugerido até 23/10

| Dia | Foco |
| --- | --- |
| 20/10 (hoje) | Fase 0 completa; começar Fase 1 |
| 21/10 | Fase 1; teste comparativo e provider real da Fase 2 |
| 22/10 | Fase 2 (custo e logs); Fase 3 na ordem da tabela; Fase 4 |
| 23/10 até 18h | Ensaio da demonstração com o seed, correções, README |

## 4. Riscos

- **PostgreSQL nunca exercitado:** é a Fase 0 por isso. Qualquer outra entrega é construída sobre uma base não provada.
- **Mock enganoso:** o mock devolve sempre evidência literal; o comportamento com IA real (trechos parafraseados, JSON inválido) só aparece na Fase 2.
- **Escopo congelado hoje:** itens da Fase 3 e 5 não previstos nos requisitos originais precisam de decisão explícita antes de entrar.
