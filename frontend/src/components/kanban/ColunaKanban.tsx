import type { ColunaKanban as DadosColuna } from "@/lib/tipos";
import { CardLead } from "./CardLead";

export function ColunaKanban({ coluna }: { coluna: DadosColuna }) {
  return (
    <section aria-label={coluna.etapa} className="flex w-64 shrink-0 flex-col rounded-2xl bg-azul-suave p-3 xl:w-auto xl:min-w-0">
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-azul">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-azul" aria-hidden />
          <span className="truncate">{coluna.etapa}</span>
        </h2>
        <span className="grid h-7 min-w-7 place-items-center rounded-full bg-white px-2 text-xs font-bold text-tinta">
          {coluna.total}
        </span>
      </header>
      {coluna.cards.length === 0 ? (
        <p className="py-3 text-center text-sm text-cinza">Nenhum lead</p>
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
