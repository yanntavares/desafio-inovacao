import Image from "next/image";

const ARQUIVO = {
  azul: "/image/Logo%20da%20plataforma%20azul.png",
  verde: "/image/Logo%20da%20plataforma%20verde.png",
} as const;

interface LogoProps {
  /** "verde" sobre fundo marinho, "azul" sobre fundo lima. */
  variante: keyof typeof ARQUIVO;
  className?: string;
  prioridade?: boolean;
}

export function Logo({ variante, className = "h-14 w-auto", prioridade = false }: LogoProps) {
  return (
    <Image
      src={ARQUIVO[variante]}
      alt="Ponte · Seed a bit"
      width={268}
      height={108}
      priority={prioridade}
      className={className}
    />
  );
}
