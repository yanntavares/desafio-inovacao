import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const RAIZ = resolve(__dirname, "../.."); // raiz do repo, onde está o docker-compose.yml

/** SQL direto no PostgreSQL do compose. Só para montar situações que a API não cria (ex.: falha da IA). */
function sql(comando: string): void {
  execFileSync("docker", ["compose", "exec", "-T", "db", "psql", "-U", "handoff", "-d", "handoff", "-v", "ON_ERROR_STOP=1", "-c", comando], {
    cwd: RAIZ,
    stdio: "pipe",
  });
}

/**
 * Deixa o lead como numa falha real da extração: a IA falhou antes de gravar, então não há itens nem
 * pendências; a jornada fica em FALHA_EXTRACAO e o job da extração em "falhou".
 */
export function simularFalhaDeExtracao(jornadaId: number): void {
  const id = Number(jornadaId);
  sql(`delete from pendencia where jornada_id = ${id}`);
  sql(`delete from item where jornada_id = ${id}`);
  sql(`update jornada set estado = 'FALHA_EXTRACAO' where id = ${id}`);
  sql(`update job set status = 'falhou', erro = 'simulado pelo teste' where jornada_id = ${id} and tipo = 'extracao'`);
}
