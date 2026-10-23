// Grafismos das telas 01/02/03: faixas diagonais e setas finas. Puramente decorativos.

const FAIXAS = [
  { y: 0.32, cor: "lima", largura: 22 },
  { y: 0.42, cor: "azul", largura: 18 },
  { y: 0.52, cor: "lima", largura: 26 },
  { y: 0.6, cor: "azul", largura: 14 },
  { y: 0.7, cor: "lima", largura: 20 },
  { y: 0.78, cor: "azul", largura: 24 },
  { y: 0.88, cor: "lima", largura: 18 },
  { y: 0.97, cor: "azul", largura: 22 },
  { y: 1.08, cor: "lima", largura: 26 },
  { y: 1.18, cor: "azul", largura: 18 },
] as const;

const COR = { lima: "rgba(219, 234, 53, 0.12)", azul: "rgba(5, 99, 180, 0.35)" };

export function FaixasDiagonais({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {FAIXAS.map((f, i) => (
        <line
          key={i}
          x1={-10}
          y1={f.y * 100 + 30}
          x2={110}
          y2={f.y * 100 - 45}
          stroke={COR[f.cor]}
          strokeWidth={f.largura}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

interface SetasProps {
  direcao: "esquerda" | "direita";
  quantidade: number;
  className?: string;
  /** Cor da primeira seta; as demais usam a cor do texto (currentColor). */
  corPrimeira?: string;
}

export function SetasDecorativas({ direcao, quantidade, className = "", corPrimeira }: SetasProps) {
  return (
    <div aria-hidden className={`pointer-events-none flex justify-between gap-8 ${className}`}>
      {Array.from({ length: quantidade }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 120 10"
          className="h-2.5 w-24 shrink md:w-32"
          style={i === 0 && corPrimeira ? { color: corPrimeira } : undefined}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
        >
          {direcao === "esquerda" ? (
            <path d="M119 5H1M1 5l5-4M1 5l5 4" />
          ) : (
            <path d="M1 5h118M119 5l-5-4M119 5l-5 4" />
          )}
        </svg>
      ))}
    </div>
  );
}
