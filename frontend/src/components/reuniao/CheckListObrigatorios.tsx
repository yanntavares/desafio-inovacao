import { IconeCheckCirculo, IconeCirculoVazio } from "@/components/icones";

export interface Obrigatorio {
  rotulo: string;
  ok: boolean;
}

/** Card "Campos obrigatórios" da tela 05; a contagem é derivada do formulário. */
export function CheckListObrigatorios({ itens }: { itens: Obrigatorio[] }) {
  const feitos = itens.filter((i) => i.ok).length;
  const completo = feitos === itens.length;
  return (
    <section
      aria-labelledby="titulo-obrigatorios"
      className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_4px_10px_rgba(15,27,45,0.08)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titulo-obrigatorios" className="text-xl font-bold text-azul-escuro">
          Campos obrigatórios
        </h2>
        <span className={`text-sm font-bold ${completo ? "text-emerald-700" : "text-cinza"}`}>
          {feitos} de {itens.length}
        </span>
      </div>
      <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {itens.map((item) => (
          <li key={item.rotulo} className="flex items-center gap-2.5 text-[15px] text-tinta">
            {item.ok ? (
              <IconeCheckCirculo corFundo="#15803d" corCheck="#ffffff" className="h-5 w-5 shrink-0" />
            ) : (
              <IconeCirculoVazio className="h-5 w-5 shrink-0 text-slate-300" />
            )}
            <span className={item.ok ? "" : "text-cinza"}>{item.rotulo}</span>
            <span className="sr-only">{item.ok ? "(preenchido)" : "(pendente)"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
