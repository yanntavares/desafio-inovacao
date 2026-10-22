export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-marinho text-sm text-white/70" role="status">
      {texto}
    </div>
  );
}
