import type { NaturezaItem } from "@/lib/tipos";

/** Naturezas que a pessoa pode atribuir ao revisar um item da ficha. */
export const NATUREZAS: { valor: NaturezaItem; rotulo: string }[] = [
  { valor: "acordado", rotulo: "Acordado" },
  { valor: "em_discussao", rotulo: "Em discussão" },
  { valor: "sugestao_ia", rotulo: "Sugestão da IA" },
];

/** Item incluído à mão não é "sugestão da IA": só estas duas. */
export const NATUREZAS_MANUAIS = NATUREZAS.filter((n) => n.valor !== "sugestao_ia");
