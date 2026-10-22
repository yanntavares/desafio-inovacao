import type { PainelFunil } from "@/lib/tipos";
import { CLASSE_CARTAO } from "./estilos";

export function CartoesMetricas({ kpis }: { kpis: PainelFunil["kpis"] }) {
  const cartoes = [
    ["Leads no funil", kpis.leads_no_funil, "text-azul-escuro"],
    ["Em validação", kpis.em_validacao, "text-azul"],
    ["Handoffs aguardando aceite", kpis.handoffs_aguardando_aceite, "text-[#9aa81f]"],
    ["Pendências bloqueantes", kpis.pendencias_bloqueantes, "text-azul/70"],
  ] as const;

  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cartoes.map(([rotulo, valor, cor]) => (
        <div key={rotulo} className={`${CLASSE_CARTAO} relative overflow-hidden px-6 py-5`}>
          <span aria-hidden className="absolute inset-y-6 left-0 w-1 rounded-r bg-lima" />
          <dt className="text-[15px] font-semibold text-cinza">{rotulo}</dt>
          <dd className={`mt-2 text-4xl font-bold ${cor}`}>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
