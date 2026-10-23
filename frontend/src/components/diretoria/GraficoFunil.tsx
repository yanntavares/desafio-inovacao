import type { PainelFunil } from "@/lib/tipos";
import { CLASSE_CARTAO } from "./estilos";

/** Barras horizontais em CSS: largura proporcional à maior etapa; a última (fim do funil) em lima. */
export function GraficoFunil({ funil }: { funil: PainelFunil["funil"] }) {
  const maior = Math.max(1, ...funil.map((e) => e.total));

  return (
    <section className={`${CLASSE_CARTAO} p-6 lg:p-8`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-tinta">Funil por etapa</h2>
        <p className="text-sm text-cinza">Todos os leads ativos</p>
      </div>
      <ul className="mt-6 flex flex-col gap-4">
        {funil.map((e, i) => (
          <li key={e.etapa} className="grid grid-cols-[8.5rem_1fr] items-center gap-4 sm:grid-cols-[11rem_1fr]">
            <span className="text-[15px] font-semibold text-tinta">{e.etapa}</span>
            <div className="flex items-center gap-3">
              <div
                className={`h-10 rounded ${i === funil.length - 1 ? "bg-lima" : "bg-azul"}`}
                // Etapa vazia ainda mostra um traço, para não parecer erro de carga.
                style={{ width: `${e.total ? (88 * e.total) / maior : 0}%`, minWidth: "0.25rem" }}
              />
              <span className="text-[15px] font-bold text-azul-escuro">{e.total}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
