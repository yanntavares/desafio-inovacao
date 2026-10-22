import type { ColunaKanban as DadosColuna } from "@/lib/tipos";
import { CardLead } from "./CardLead";

export function ColunaKanban({ coluna }: { coluna: DadosColuna }) {
  return (
    <section aria-label={coluna.etapa} className="flex w-64 shrink-0 flex-col rounded-xl bg-slate-200/70 p-2 xl:w-auto xl:min-w-0">
      <header className="mb-2 flex items-center justify-between gap-2 px-1.5 pt-1.5">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold leading-tight text-azul">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-azul" aria-hidden />
          <span>{coluna.etapa}</span>
        </h2>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-bold text-tinta shadow-sm">
          {coluna.total}
        </span>
      </header>
      {coluna.cards.length === 0 ? (
        <p className="py-4 text-center text-sm text-cinza">Nenhum lead</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {coluna.cards.map((card) => (
            <li key={card.id}>
              <CardLead card={card} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
