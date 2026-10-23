import { notFound } from "next/navigation";
import { RevisaoItens } from "@/components/revisao/RevisaoItens";

// Mesmo motivo da página do lead: id dinâmico, sem shell estático a gerar.
export const instant = false;

export default async function RevisaoPage({ params }: PageProps<"/jornadas/[id]/revisao">) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  return <RevisaoItens key={numero} id={numero} />;
}
