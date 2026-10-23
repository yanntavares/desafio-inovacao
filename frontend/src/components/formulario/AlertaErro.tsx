export function AlertaErro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <div role="alert" className="rounded-lg border border-perigo/30 bg-perigo-suave px-4 py-3 text-sm font-medium text-perigo">
      {mensagem}
    </div>
  );
}
