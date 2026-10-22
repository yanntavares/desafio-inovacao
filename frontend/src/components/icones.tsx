// Ícones em SVG inline (poucos, sem dependência). Herdam a cor do texto.

type PropsIcone = React.SVGProps<SVGSVGElement>;

export function IconeCheck(props: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden {...props}>
      <path d="M6 12.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Círculo preenchido com check (lista de benefícios, cartão de demonstração selecionado). */
export function IconeCheckCirculo({ corFundo, corCheck, ...props }: PropsIcone & { corFundo: string; corCheck: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <circle cx={12} cy={12} r={12} fill={corFundo} />
      <path
        d="M7 12.5l3.2 3.2L17 9"
        fill="none"
        stroke={corCheck}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconeSeta(props: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconeSair(props: PropsIcone) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...props}>
      <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
