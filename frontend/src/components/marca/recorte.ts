// Borda "rasgada" dos painéis das telas, como clip-path. Semente fixa: o mesmo
// polígono no servidor e no cliente, sem divergência de hidratação.

export interface LadosRecortados {
  topo?: boolean;
  direita?: boolean;
  baixo?: boolean;
  esquerda?: boolean;
}

function gerador(semente: number) {
  let s = semente;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PASSOS = 90;

export function clipRecortado(lados: LadosRecortados, amplitude = 6, semente = 7): string {
  const aleatorio = gerador(semente);
  const desvio = (ativo?: boolean) => (ativo ? (aleatorio() * amplitude).toFixed(1) : "0");
  const pontos: string[] = [];
  const passo = (i: number) => ((i / PASSOS) * 100).toFixed(2);

  for (let i = 0; i <= PASSOS; i++) pontos.push(`${passo(i)}% ${desvio(lados.topo)}px`);
  for (let i = 0; i <= PASSOS; i++) pontos.push(`calc(100% - ${desvio(lados.direita)}px) ${passo(i)}%`);
  for (let i = PASSOS; i >= 0; i--) pontos.push(`${passo(i)}% calc(100% - ${desvio(lados.baixo)}px)`);
  for (let i = PASSOS; i >= 0; i--) pontos.push(`${desvio(lados.esquerda)}px ${passo(i)}%`);

  return `polygon(${pontos.join(", ")})`;
}
