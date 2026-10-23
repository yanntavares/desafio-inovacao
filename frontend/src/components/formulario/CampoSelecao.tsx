import { useId } from "react";
import { IconeSeta } from "@/components/icones";

interface CampoSelecaoProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  rotulo: string;
  /** Motivo escrito quando o campo está travado (aparece abaixo do campo). */
  ajuda?: string | null;
}

/** Select das telas internas (fundo branco, rótulo escuro e chevron próprio). */
export function CampoSelecao({ rotulo, ajuda, className = "", children, ...props }: CampoSelecaoProps) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-tinta">
        {rotulo}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-describedby={ajuda ? idAjuda : undefined}
          className="h-12 w-full appearance-none rounded-lg border border-slate-300 bg-white shadow-sm hover:border-azul pl-4 pr-11 text-[15px] text-tinta outline-none transition focus:border-azul focus:ring-2 focus:ring-azul/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-cinza"
          {...props}
        >
          {children}
        </select>
        <IconeSeta className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cinza" />
      </div>
      {ajuda && (
        <p id={idAjuda} className="mt-1.5 text-xs text-cinza">
          {ajuda}
        </p>
      )}
    </div>
  );
}
