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
| Seed de demonstração (10 leads em todas as etapas, inclusive um concluído; 6 contas, com usuário técnico) | `seed/__init__.py` | Feito; `GET /auth/demo` lista os 4 perfis (analista, gerente, técnico, Diretoria) |

## 2. O que falta, em ordem

### Fase 0 — Provar em PostgreSQL (primeiro, antes de qualquer feature)

**Feita em 21/10.** Compose + migrations + seed no Postgres; lead novo foi a `EM_VALIDACAO` pelo worker real; `make test-pg` roda a suíte inteira no banco `handoff_teste` (31 testes, incluindo dois workers concorrentes sem job duplicado), e o CI roda assim. Corrigido no caminho: `python -m app.seed` (faltava `__main__.py`) e as chaves de estado das notificações (valores do enum são maiúsculos). Atenção: um Postgres instalado no WSL na 5432 sombreia o do compose; use `DB_PORT=5433` no `.env`.

1. Subir `make up` e rodar `python -m app.seed` no container. Corrigir o que o PostgreSQL recusar (enums nativos compartilhados, JSON, `Date`).
2. Migração: ninguém tem banco criado, então a `0001` (que usa `create_all`) continua sendo editada no lugar. Passar a gerar revisões (`make revision`) só depois da primeira entrega.
3. Teste do worker com PostgreSQL: dois workers, `SKIP LOCKED`, nenhum job processado duas vezes.
4. Rodar a suíte contra o banco do compose (serviço `db` de teste ou marcador `pytest -m postgres`), mantendo SQLite para o ciclo rápido.

Pronto quando: `make up` + seed + `make test` passam, e um lead anda de `CRIADA` a `CONCLUIDA` pelo worker real.

### Fase 1 — Lacunas dos invariantes (testes que ainda não existem)

**Feita em 21/10** (`tests/api/test_invariantes.py`, 9 testes, SQLite e PostgreSQL). Única mudança de código: a tentativa recusada (403/409 de usuário autenticado) agora grava `acao_recusada` na auditoria, numa transação própria depois do rollback (handler em `main.py`).

- Extração com saída inválida: até 2 reparos e depois `FALHA_EXTRACAO` (usar um provider falso que devolve JSON quebrado).
- "Tentar de novo" não duplica itens (mesma chave de idempotência).
- Item sem trecho literal vira `inferida` e perde as evidências.
- Injeção na transcrição: texto com "ignore as instruções" não altera itens nem estado.
- Transições inválidas (tabela completa de `TRANSICOES`) e G4 com gerente errado.
- Quem valida não aceita o próprio handoff, com o mesmo usuário nos dois papéis.
- Tentativa recusada (403/409) também vai para a auditoria — hoje só a ação bem-sucedida é gravada.

### Fase 2 — Provedor de IA real

**Decidido em 21/10: Claude (Anthropic)**, sem comparativo com OpenAI. Feito: `llm/anthropic.py` (`AnthropicProvider`, modelo em `LLM_MODELO`, padrão `claude-sonnet-5-5`, effort `medium`; saída por `json_schema`; `fallbacks="default"` para recusa do classificador; sem tools; transcrição mascarada dentro de `<transcricao>`), prompt `redacao_v1.md`, `LLM_MAX_TOKENS=16000` aplicado, tokens/custo em `job` (extração e agora também `tipo="redacao"`), `ia` no detalhe do lead e no funil, logs do SDK/httpx em WARNING. Testes com cliente falso em `tests/test_llm_anthropic.py`. Isolamento entre clientes: cada chamada leva só o lead do job (reunião na extração, itens e pendências do lead na redação) e os `item_ids` devolvidos pela redação são filtrados pelos ids enviados; testado. **Falta:** rodar com chave real (pago, com autorização) e medir latência para decidir o item 4.

1. Teste comparativo nas 3 transcrições fictícias (precisão da evidência, taxa de reparo, custo, latência). Usar a skill `claude-api` e os IDs de modelo atuais.
2. Implementar o provider escolhido em `llm/`: prompt com a transcrição delimitada por `<transcricao>`, sem ferramentas com efeito colateral, `LLM_MAX_TOKENS` aplicado de fato (hoje só existe na config).
3. Registrar tokens, latência e custo por chamada no `job` (colunas já existem) e expor custo por jornada.
4. Mover a redação de documentos para job assíncrono se a latência passar de poucos segundos (hoje roda dentro da requisição).
5. Garantir que nenhum log grave texto da transcrição.

### Fase 3 — O que as telas pedem e ainda não tem endpoint

Feito em 21/10: `GET /reunioes/opcoes`, `POST /reunioes/pre-visualizar`, `GET /projetos`, `GET /busca`, `GET /notificacoes` e `POST /notificacoes/lidas` (derivadas da auditoria). "Histórico" = `GET /kanban?concluidas=true`. "Esqueci a senha" ficou fora do MVP (link desabilitado: "fale com a Diretoria").

Também feito: resumo gerencial gerado pelo gerente designado já em `HANDOFF_ENVIADO` (`POST /jornadas/{id}/documentos` com `tipo=resumo_gerencial`; vem em `GET /jornadas/{id}` como `resumo_gerencial`; o seed gera um para cada lead a partir de "Handoff enviado") e `GET /auditoria?desde=&ate=`. Reenviar convite ficou fora do MVP (sem e-mail, a Diretoria avisa por fora).

Decidido: o gerente também cadastra reunião (escolhe o analista responsável). A Diretoria não.

### Seed ajustado para o front (22/10)

Usuário técnico (`paulo.nunes`, somente leitura) e lead concluído (Ateliê Vento Sul: Marina + Rafael, com pauta aprovada) para o Histórico e o perfil técnico terem dados; o técnico entra em `GET /auth/demo`. Testes novos em `tests/api/test_telas.py` (carteira do histórico, técnico só lê com 403 em validar/concluir/gerar documento/cadastrar reunião). Suíte rodada no container: 56 passed + 1 skipped no SQLite, 57 passed no PostgreSQL (`handoff_teste`). `make test` não roda aqui (sem `uv`): pytest e httpx foram instalados em `/tmp/dev` do container da API e a suíte roda com `PYTHONPATH=/tmp/dev python -m pytest`.

### Ajustes pedidos pelo front (23/10)

- **Vínculos parágrafo → item na edição** (`documentos._remapear_vinculos`): o vínculo guarda o índice da linha; ao editar (rascunho ou nova versão de aprovado) cada linha de texto idêntico herda os `item_ids`, linha nova ou alterada fica sem evidência. Teste: `test_editar_documento_mantem_o_vinculo_com_a_linha_certa` (`tests/api/test_invariantes.py`).
- **Diretoria não muda o próprio perfil** (`usuarios.atualizar`): 403 "Peça a outra conta da Diretoria para mudar o seu perfil." (a sessão perderia as telas da Diretoria no meio do uso). Teste: `test_diretoria_nao_muda_o_proprio_perfil` (`tests/api/test_telas.py`).
- **`GET /historico`** (`jornadas.historico`): histórico de documentação de todos os leads visíveis numa consulta por tabela (documentos e pacotes com `jornada_id IN`), para as telas 07/07b não fazerem uma chamada por lead. Visibilidade de `_consulta_visivel`; o gerente vê só os leads cujo pacote recebeu. Teste: `test_historico_agregado_respeita_a_carteira` (analista, outro analista, gerente, técnico, 401). O resumo de cada pacote ainda conta as bloqueantes por lead (uma consulta por pacote dentro da mesma requisição); aceitável no volume atual.
- Suíte em SQLite: 59 passed, 1 skipped. No PostgreSQL (`make test-pg`, 23/10): 60 passed.

### Fase 4 — Segurança e operação

**Feita em 21/10.** API recusa subir fora do demo com segredo de exemplo ou curto (`Settings.validar_producao` no lifespan); login bloqueia 15 min após 5 senhas erradas (falhas na auditoria como `login_falhou`); `POST /auth/renovar`; job `segredos` (gitleaks) no CI; README com endpoints, roteiro da demonstração e segurança. Testes em `tests/api/test_seguranca.py`.

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

- **IA real não exercitada:** toda a suíte e a demonstração rodam com `LLM_PROVIDER=mock`, que sempre devolve evidência literal. O `AnthropicProvider` existe, mas falta o teste comparativo nas 3 transcrições fictícias (trechos parafraseados, JSON inválido, reparos, custo e latência). A redação de documentos roda dentro da requisição; se a latência real passar de alguns segundos, vira job (Fase 2, item 4).
