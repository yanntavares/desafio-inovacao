import { IconeSeta } from "@/components/icones";

const CLASSE_SELECT =
  "h-12 appearance-none rounded-lg border border-slate-300 bg-white pl-4 pr-11 text-[15px] font-semibold text-tinta outline-none transition focus:border-azul focus:ring-2 focus:ring-azul/30 disabled:cursor-not-allowed disabled:opacity-100";

/** Select de filtro sem rótulo visível (barras de filtro do kanban e da Diretoria). */
export function SelecaoFiltro({
  rotulo,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { rotulo: string }) {
  return (
    <div className="relative">
      <select aria-label={rotulo} className={CLASSE_SELECT} {...props}>
        {children}
      </select>
      <IconeSeta className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cinza" />
    </div>
  );
}

export function paraId(valor: string): number | null {
  return valor ? Number(valor) : null;
}
