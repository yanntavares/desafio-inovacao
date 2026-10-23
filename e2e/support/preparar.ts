import { URL_API, URL_FRONT } from "../playwright.config";
import { recarregarDemonstracao } from "./api";

/** Antes da suíte: confere que a stack está de pé e parte sempre do mesmo seed. */
export default async function preparar(): Promise<void> {
  for (const [nome, url] of [["API", `${URL_API}/health`], ["front", `${URL_FRONT}/login`]] as const) {
    const ok = await fetch(url).then((r) => r.ok, () => false);
    if (!ok) throw new Error(`${nome} fora do ar em ${url}. Suba a stack com \`make up\` e espere ficar saudável.`);
  }
  await recarregarDemonstracao();
}
