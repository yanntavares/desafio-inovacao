interface BotaoPrimarioProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  carregando?: boolean;
  textoCarregando?: string;
}

export function BotaoPrimario({
  carregando = false,
  textoCarregando = "Aguarde…",
  disabled,
  children,
  className = "",
  ...props
}: BotaoPrimarioProps) {
  return (
    <button
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`h-14 w-full rounded-lg bg-azul text-lg font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {carregando ? textoCarregando : children}
    </button>
  );
}
