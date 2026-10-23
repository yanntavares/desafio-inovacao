import { notFound } from "next/navigation";
import { PaginaJornada } from "@/components/jornada/PaginaJornada";

// O layout (app) lê usePathname fora de <Suspense>; com o id dinâmico não há shell estático a gerar.
export const instant = false;

export default async function JornadaPage({ params, searchParams }: PageProps<"/jornadas/[id]">) {
  const { id } = await params;
  // ?documento=N: o Histórico (07/07b) abre o lead já com esse documento aberto.
  const documento = Number((await searchParams).documento);
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  // key: trocar de lead recria o estado da página em vez de mostrar dados do anterior.
  return <PaginaJornada key={numero} id={numero} documentoInicial={Number.isInteger(documento) && documento > 0 ? documento : null} />;
}
