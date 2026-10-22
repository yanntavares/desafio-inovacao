import { EmConstrucao } from "@/components/layout/EmConstrucao";

// O layout (app) lê usePathname fora de <Suspense>; com o id dinâmico não há shell estático a gerar.
export const instant = false;

export default async function JornadaPage({ params }: PageProps<"/jornadas/[id]">) {
  const { id } = await params;
  return (
    <EmConstrucao
      titulo={`Lead #${id}`}
      subtitulo="Reunião cadastrada. A extração da ficha roda em segundo plano."
      tela="06"
    />
  );
}
