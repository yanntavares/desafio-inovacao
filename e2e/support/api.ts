import { URL_API } from "../playwright.config";

export const SENHA_DEMO = "demonstracao1";
export const DOMINIO = "seedabit.org.br";

export interface Sessao {
  token: string;
  usuario: { id: number; nome: string; email: string; papel: string };
}

async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${URL_API}${caminho}`, init);
  if (!resposta.ok) throw new Error(`${init.method ?? "GET"} ${caminho} → ${resposta.status}: ${await resposta.text()}`);
  return (await resposta.json()) as T;
}

/** Entra na API como um usuário do seed (`marina.costa`, `rafael.lima`, `paulo.nunes`, `diretoria`...). */
export function entrarNaApi(chave: string): Promise<Sessao> {
  return chamar<Sessao>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${chave}@${DOMINIO}`, senha: SENHA_DEMO }),
  });
}

/** Recarrega a demonstração (apaga tudo e roda o seed). Os ids dos leads mudam a cada reset. */
export async function recarregarDemonstracao(): Promise<void> {
  const diretoria = await entrarNaApi("diretoria");
  await chamar("/demo/recarregar", { method: "POST", headers: { Authorization: `Bearer ${diretoria.token}` } });
}

/** Id do lead pelo nome do cliente: o id não é estável entre resets, o nome é. */
export async function idDoLead(cliente: string, comoChave = "rafael.lima"): Promise<number> {
  const sessao = await entrarNaApi(comoChave);
  for (const concluidas of [false, true]) {
    const quadro = await chamar<{ colunas: { cards: { id: number; cliente: string }[] }[] }>(
      `/kanban?concluidas=${concluidas}`,
      { headers: { Authorization: `Bearer ${sessao.token}` } },
    );
    const achado = quadro.colunas.flatMap((c) => c.cards).find((c) => c.cliente === cliente);
    if (achado) return achado.id;
  }
  throw new Error(`Lead "${cliente}" não encontrado. Rode o seed de demonstração.`);
}

/** Quantos itens o lead tem (para provar que "tentar de novo" não duplica). */
export async function contarItens(jornadaId: number, comoChave = "rafael.lima"): Promise<number> {
  const sessao = await entrarNaApi(comoChave);
  const itens = await chamar<unknown[]>(`/jornadas/${jornadaId}/itens`, { headers: { Authorization: `Bearer ${sessao.token}` } });
  return itens.length;
}

export interface ItemApi {
  id: number;
  descricao: string;
  categoria: string;
  status_validacao: string;
  natureza_final: string | null;
  origem: string;
}

/** Itens do lead como a API os devolve (para conferir o efeito de uma ação feita na tela). */
export async function itensDoLead(jornadaId: number, comoChave = "rafael.lima"): Promise<ItemApi[]> {
  const sessao = await entrarNaApi(comoChave);
  return chamar<ItemApi[]>(`/jornadas/${jornadaId}/itens`, { headers: { Authorization: `Bearer ${sessao.token}` } });
}
