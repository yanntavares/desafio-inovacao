import Link from "next/link";
import type { ProjetoPainel } from "@/lib/tipos";
import { CLASSE_CARTAO } from "./estilos";

const LIMITE = 5;

// Cor do chip pela etapa do funil (tela 03): avanço em azul, fim em verde, retrabalho em laranja.
const COR_ETAPA: Record<string, string> = {
  "Nova reunião": "bg-slate-100 text-tinta",
  "Em validação": "bg-amber-50 text-amber-700",
  Validada: "bg-azul-suave text-azul",
  "Handoff enviado": "bg-azul-suave text-azul",
  Aceito: "bg-emerald-50 text-emerald-700",
  "Briefing aprovado": "bg-emerald-50 text-emerald-700",
};

export function ListaProjetos({ projetos }: { projetos: ProjetoPainel[] }) {
  return (
    <section className={`${CLASSE_CARTAO} p-6 lg:p-8`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-tinta">Projetos e negócios</h2>
        <Link href="/kanban/geral" className="text-[15px] font-bold text-azul hover:underline">
          Ver todos
        </Link>
      </div>
      {projetos.length === 0 ? (
        <p className="mt-6 text-[15px] text-cinza">Nenhum lead ativo com estes filtros.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 border-b border-slate-200">
          {projetos.slice(0, LIMITE).map((p) => (
            <li key={p.id}>
              <Link
                href={`/jornadas/${p.id}`}
                title={p.titulo}
                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-fundo"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-tinta">{p.cliente}</p>
                  <p className="truncate text-sm text-cinza">Gerente: {p.gerente ?? "—"}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                    COR_ETAPA[p.etapa] ?? "bg-slate-100 text-tinta"
                  }`}
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                  {p.etapa}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
