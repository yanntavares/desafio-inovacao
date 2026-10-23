import type { NaturezaItem, OrigemItem } from "@/lib/tipos";

type Variante = NaturezaItem | "nao_informado";

const ESTILO: Record<Variante, { rotulo: string; classe: string; ponto: string; dica: string }> = {
  acordado: {
    rotulo: "Acordado",
    classe: "bg-emerald-50 text-emerald-800",
    ponto: "bg-emerald-600",
    dica: "Confirmado por pessoa na validação.",
  },
  em_discussao: {
    rotulo: "Em discussão",
    classe: "bg-amber-50 text-amber-800",
    ponto: "bg-amber-600",
    dica: "Citado na reunião, mas ainda não fechado com o cliente.",
  },
  sugestao_ia: {
    rotulo: "Sugestão da IA",
    classe: "bg-violet-50 text-violet-800",
    ponto: "bg-violet-600",
    dica: "Proposto pela IA e ainda não decidido por pessoa.",
  },
  nao_informado: {
    rotulo: "Não informado",
    classe: "bg-slate-100 text-tinta",
    ponto: "bg-slate-500",
    dica: "Nenhum item validado nesta seção.",
  },
};

export function ChipNatureza({ natureza }: { natureza: Variante }) {
  const e = ESTILO[natureza];
  return (
    <span
      title={e.dica}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${e.classe}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${e.ponto}`} />
      {e.rotulo}
    </span>
  );
}

const ORIGEM: Record<OrigemItem, string | null> = {
  explicita: null, // padrão: dita na reunião, com trecho; não precisa de selo
  inferida: "Inferido",
  manual: "Manual",
};

export function ChipOrigem({ origem }: { origem: OrigemItem }) {
  const rotulo = ORIGEM[origem];
  if (!rotulo) return null;
  return (
    <span
      title={origem === "inferida" ? "Sem trecho literal na transcrição: tratado como inferido." : "Incluído por pessoa."}
      className="inline-flex shrink-0 items-center rounded-full border border-slate-300 px-2.5 py-0.5 text-xs font-semibold text-cinza"
    >
      {rotulo}
    </span>
  );
}
