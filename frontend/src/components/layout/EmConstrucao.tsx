interface EmConstrucaoProps {
  titulo: string;
  subtitulo: string;
  tela?: string;
}

/** Página provisória do shell até a tela correspondente ser implementada. */
export function EmConstrucao({ titulo, subtitulo, tela }: EmConstrucaoProps) {
  return (
    <section>
      <h1 className="text-4xl font-extrabold text-azul-escuro">{titulo}</h1>
      <p className="mt-2 text-lg text-cinza">{subtitulo}</p>
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-cinza">
        Tela em implementação{tela ? ` (protótipo ${tela} em docs/telas)` : ""}.
      </div>
    </section>
  );
}
