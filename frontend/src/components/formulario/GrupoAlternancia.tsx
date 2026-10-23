interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

interface GrupoAlternanciaProps<T extends string> {
  rotulo: string;
  opcoes: Opcao<T>[];
  valor: T;
  aoMudar: (valor: T) => void;
  /** "forte": selecionado em azul cheio (lead); "suave": azul claro com borda (transcrição). */
  variante?: "forte" | "suave";
}

const SELECIONADO = {
  forte: "border-azul bg-azul text-white",
  suave: "border-azul bg-azul-suave text-azul-escuro",
};

/** Par de botões mutuamente exclusivos (tela 05: "Lead existente / Novo lead", "Enviar arquivo / Colar texto"). */
export function GrupoAlternancia<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  variante = "forte",
}: GrupoAlternanciaProps<T>) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2.5">
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aoMudar(opcao.valor)}
            className={`h-12 rounded-lg border px-5 text-[15px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30 ${
              ativo ? SELECIONADO[variante] : "border-slate-300 bg-white text-cinza hover:border-azul/50 hover:text-azul-escuro"
            }`}
          >
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}
