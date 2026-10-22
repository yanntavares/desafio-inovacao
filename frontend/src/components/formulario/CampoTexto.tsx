import { useId } from "react";

interface CampoTextoProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  rotulo: string;
  /** "sobreMarinho": rótulo lima (tela 01); "sobreLima": rótulo marinho (tela 02). */
  tom: "sobreMarinho" | "sobreLima";
  erro?: string | null;
}

const COR_ROTULO = { sobreMarinho: "text-lima", sobreLima: "text-azul-escuro" };

export function CampoTexto({ rotulo, tom, erro, className = "", ...props }: CampoTextoProps) {
  const id = useId();
  const idErro = `${id}-erro`;
  return (
    <div className={className}>
      <label htmlFor={id} className={`mb-1.5 block text-sm font-bold ${COR_ROTULO[tom]}`}>
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className={`h-12 w-full rounded-lg border bg-white px-4 text-[15px] text-tinta outline-none transition placeholder:text-cinza/60 focus:border-azul focus:ring-2 focus:ring-azul/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-cinza ${
          erro ? "border-perigo" : "border-slate-300"
        }`}
        {...props}
      />
      {erro && (
        <p id={idErro} role="alert" className={`mt-1.5 text-xs font-medium ${tom === "sobreMarinho" ? "text-red-300" : "text-perigo"}`}>
          {erro}
        </p>
      )}
    </div>
  );
}
