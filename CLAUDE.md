# CLAUDE.md — Handoff Comercial → Projetos

MVP de uma fatia vertical: **transcrição → dados validados → pacote de handoff → briefing de projeto → pauta de kickoff**.
Back: Python (FastAPI + PostgreSQL). Front: Next.js + TypeScript em `frontend/`. Tudo em **português do Brasil** (UI, mensagens, prompts, docs, commits e nomes de domínio).

Prazo: congelamento de escopo em 20/10/2026; entrega 23/10 (meta interna 18h). Priorize a fatia ponta a ponta; não amplie escopo.

## Fontes de verdade
- `docs/requisitos-enxutos.docx` — capacidades, invariantes, gates, restrições, escopo cortado.
- `docs/user-stories.docx` — 24 histórias por papel, padrões de UI, mensagens de bloqueio.
<<<<<<< Updated upstream
- `docs/telas/` — telas do projeto (quando chegarem; o front só avança com elas).
=======
- `docs/telas/` — 7 telas (cadastro de conta, login, Diretoria, kanban geral e do analista, cadastro de reunião, página do lead). **Mandam sobre as user stories** onde divergirem.
- `docs/plano-implementacao-backend.md` — o que já existe no back e o que falta, em ordem.
- `docs/plano-implementacao-frontend.md` — idem para o front. **Ainda não existe:** crie-o antes de começar a implementar telas.
>>>>>>> Stashed changes
- `README.md` — como subir, estrutura e próximos passos.
Em caso de dúvida de produto, consulte esses documentos antes de decidir. Telas e textos das user stories são hipóteses a validar, não contrato.
Os .docx não são legíveis pelo Read; extraia com `unzip -p docs/X.docx word/document.xml | sed -e 's#</w:p>#\n#g' -e 's#<[^>]*>##g'`.

## Comandos
```bash
make up                 # .env + docker compose (db + api + worker); API em :8000, /docs, /health
make test               # cd backend && pytest -q  (antes: pip install -e "backend[dev]")
make migrate            # alembic upgrade head no container
make revision m="txt"   # migração autogerada a partir dos models
make logs               # logs de api e worker
cd frontend && npm run dev | build | lint
```
`LLM_PROVIDER=mock` por padrão: nunca faça chamadas pagas de IA em testes ou desenvolvimento. Segredos só em `.env` (nunca commitar).

## Arquitetura do backend (`backend/app/`)
- `api/` routers HTTP finos, **sem regra de negócio**.
- `services/` regras: orquestrador de estados, gates, auditoria, pacote.
- `models/` 10 tabelas (um arquivo por assunto + `enums.py`); JSON para segmentos, máscaras, evidências e vínculos documento→item.
- `schemas/` contratos Pydantic (API e saída da IA).
- `llm/` `LLMProvider` (real + mock) e `prompts/` versionados em arquivo.
- `core/` config (.env) e banco. `seed/` dados de demonstração. `worker.py` consome a fila de jobs no PostgreSQL.
- Dependência: `api`/`worker` → `services` → `models`/`llm`. `models` não conhece camadas acima.
- Migrações Alembic; toda mudança de model gera revisão (`make revision`).

## Invariantes (cada um exige teste automatizado; nenhuma pode depender só de prompt)
1. **Sem origem, sem fato.** Item exige evidência literal no segmento citado; sem trecho → origem "inferido". Campo ausente = "não informado". Orçamento, prazo e preço **nunca** recebem valor da IA. Números e datas em textos gerados devem existir nos itens validados.
2. **A IA nunca decide.** Só pessoa promove item a "acordado"; quem valida (comercial) não é quem aceita (gerente).
3. **Gates na camada de serviço**, por papel e estado — nunca só na interface. A API recusa mesmo com botão desabilitado (403 com mensagem clara).
4. **Imutabilidade.** Documento aprovado e pacote de handoff são snapshots versionados (pacote com hash); editar cria nova versão.
5. **Transcrição é dado não confiável.** Entra delimitada no prompt; o modelo não tem ferramentas com efeito colateral; no máximo 2 reparos, depois falha explícita.
6. **Auditoria na mesma transação** de toda ação relevante: ator, ação, antes, depois, hora.
7. Obrigatórios por **configuração**, não por prompt; dados reais só com autorização e mascaramento.

## Estados, gates e papéis
`CRIADA → TRANSCRICAO_RECEBIDA → EXTRAINDO (→ FALHA_EXTRACAO, tentar de novo) → EM_VALIDACAO → VALIDADA → HANDOFF_ENVIADO → ACEITO → BRIEFING_APROVADO → CONCLUIDA`. Devolução do gerente volta a `EM_VALIDACAO`. **Só o orquestrador altera `Jornada.estado`.**

| Gate | Transição | Condição | Dono |
| --- | --- | --- | --- |
| G1 | EXTRAINDO → EM_VALIDACAO | schema + evidências válidos | Sistema |
| G2 | EM_VALIDACAO → VALIDADA | sem pendência bloqueante aberta (ou aceita com risco + justificativa) e aprovação explícita | Consultor comercial |
| G3 | HANDOFF_ENVIADO → ACEITO | gerente designado confirma versão específica do pacote | Gerente de projetos |
| G4 | ACEITO → BRIEFING_APROVADO | gerente revisa e aprova o briefing | Gerente de projetos |

Papéis: **comercial** cria, valida e envia (não aceita o próprio handoff); **gerente** aceita/aprova (não edita dados validados); **equipe técnica** só lê; **administrador** cadastra usuários e não aprova nada por outro. O cliente não usa o sistema. Todo endpoint novo precisa de teste 403 por papel × endpoint.

## Divisão IA × código
- **Código:** parsing (.txt/.md/.vtt/.srt, até 15 mil palavras), segmentação, mascaramento (e-mail, telefone, CPF, CNPJ), validação de schema e evidência literal, matriz de obrigatórios, estados, permissões, índice de completude, pacote, conferência de números/datas.
- **LLM (só 5 tarefas):** extração, lacunas semânticas (rótulo "origem: IA"), redação comercial, briefing de projeto, pauta de kickoff. Nunca aprova, aceita nem envia.
- Provedor atrás de `LLMProvider` (mock por padrão; anthropic/openai por `.env`). Só texto **mascarado** vai ao provedor; sem texto sensível em logs. Limite de tokens por chamada (`LLM_MAX_TOKENS`); registrar custo/tokens por jornada em `job`.
- Idempotência da extração: chave = reunião + versão do prompt + hash do texto; "tentar de novo" não duplica.
- Prompts e schemas versionados em `llm/prompts/`. Ao mudar prompt, suba a versão. Saída da IA sempre validada por Pydantic antes de tocar o banco.
- Ao escrever código/prompts com a API da Anthropic, use a skill `claude-api` e os IDs de modelo atuais.

## Modelo de dados (conceitos)
Jornada é o agregado central. Cadeia de rastreabilidade: documento → item → evidência → segmento (um clique do parágrafo ao trecho original). Item é linha: natureza proposta pela IA, natureza final só por ação humana, origem (explícita/inferida/manual), situação (informado/não informado), status de validação. Enums no banco e no código.

## Escopo
**Dentro:** os 12 recursos do MVP (jornada/painel, entrada da transcrição, extração com evidência, lacunas/pendências, revisão G2, documentos comerciais, pacote de 16 seções, aceite G3, briefing+pauta G4, rastreabilidade/auditoria, 4 papéis + seed de demonstração). Dossiê vivo (RF-34/35) é condicional.
**Fora:** áudio/transcrição automática, minuta de proposta, mudança de escopo, exportar tarefas, RAG/vetorial, ingestão por API de ferramenta, SSO, multiempresa, envio ao cliente. *Should* só se sobrar tempo (reprocessar com diff, pendências por IA, comentários por item, viabilidade, painel de IA, Drive, PDF/DOCX).
Decisão consciente: **workflow determinístico com chamadas pontuais ao LLM**, não agente autônomo (ADR-04). Stack já definida: FastAPI + Next.js.

## Frontend (`frontend/`)
Next.js 16 / React 19 / Tailwind 4 / TypeScript. **Leia `frontend/AGENTS.md`**: esta versão do Next tem breaking changes — consulte `node_modules/next/dist/docs/` antes de escrever código. Aguarde as telas em `docs/telas/`.
Padrões em todas as telas: faixa de estado da jornada (gate atual e quem age), chips de natureza e origem, evidência a um clique, botões de gate desabilitados **com o motivo escrito** (e a API recusa mesmo assim). Mensagens de erro/bloqueio dizem o que houve e a ação possível (ver tabela nas user stories). Telas por papel: comercial (painel, revisão com itens ao lado da evidência, pendências, handoff), gerente (fila, pacote, briefing, pauta), técnica (somente leitura), admin (usuários, papéis, demonstração).

## Como trabalhar
- Leia antes de editar; mudanças pequenas, no estilo do código vizinho (nomes em português no domínio, comentários escassos e só do porquê).
<<<<<<< Updated upstream
- Implemente na ordem do README ("Próximos passos"): orquestrador + gates + auditoria → papéis e 403 → entrada da transcrição → `LLMProvider` + worker → front.
=======
- **Mantenha os planos em dia.** Toda mudança de back ou front atualiza o plano correspondente (`docs/plano-implementacao-backend.md` ou `docs/plano-implementacao-frontend.md`) no **mesmo commit** da mudança: mova o item para "já existe" com o estado real (testado ou não), marque o que foi decidido ou descartado e registre novos riscos e pendências. Plano desatualizado conta como entrega incompleta.
- Siga `docs/plano-implementacao-backend.md` (o que falta no back, em ordem). Orquestrador, gates, papéis, transcrição, `LLMProvider` mock e worker já existem.
- Testes do back rodam em SQLite: o que depende de PostgreSQL (enums nativos, `SKIP LOCKED`, migração) precisa de teste próprio com o banco do compose.
>>>>>>> Stashed changes
- Escreva o teste do invariante junto com a regra. Rode `make test` (e `npm run lint` no front) antes de dar algo como pronto; se não rodou, diga.
- Não invente valores de negócio (orçamento, prazo, preço) em seeds, prompts ou fixtures de produção; seeds usam transcrições **fictícias**.
- Nada de lógica de negócio em routers ou no front; nada de mudar estado fora do orquestrador.
- Commits: Conventional Commits em português (`feat:`, `fix:`, `chore:`, `test:`, `docs:`), branch por tarefa; só commite/pushe quando pedido.
- Pergunte antes de decidir pontos em aberto: provedor de IA (teste comparativo nas 3 transcrições fictícias), dossiê vivo entra ou vira roteiro de evolução.
