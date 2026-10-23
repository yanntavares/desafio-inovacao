import { IconeCheckCirculo } from "@/components/icones";
import { iniciais, ROTULO_PAPEL } from "@/lib/rotas";
import type { PerfilDemo } from "@/lib/tipos";

interface CartaoPerfilDemoProps {
  perfil: PerfilDemo;
  /** Entrada em andamento com este perfil. */
  entrando: boolean;
  desabilitado: boolean;
  onEntrar: () => void;
}

/** Um clique entra como o perfil de demonstração (a senha não é necessária). */
export function CartaoPerfilDemo({ perfil, entrando, desabilitado, onEntrar }: CartaoPerfilDemoProps) {
  // A Diretoria aparece pelo papel (DR), não pelo nome da conta, como na tela 02.
  const sigla = perfil.papel === "admin" ? "DR" : iniciais(perfil.nome);
  const detalhe = perfil.papel === "admin" ? perfil.descricao : `${perfil.nome} · ${perfil.descricao}`;

  return (
    <button
      type="button"
      disabled={desabilitado}
      aria-busy={entrando || undefined}
      onClick={onEntrar}
      className={`flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30 disabled:cursor-not-allowed ${
        entrando
          ? "border-azul bg-azul-suave"
          : "border-slate-300 bg-white hover:border-azul hover:shadow-md disabled:opacity-60 disabled:hover:border-slate-300 disabled:hover:shadow-sm"
      }`}
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold ${
          entrando ? "bg-azul text-white" : "bg-azul-suave text-azul-escuro"
        }`}
      >
        {sigla}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold text-tinta">{ROTULO_PAPEL[perfil.papel]}</span>
        <span className="block truncate text-cinza">{entrando ? "Entrando…" : detalhe}</span>
      </span>
      {entrando && <IconeCheckCirculo corFundo="#0563b4" corCheck="#ffffff" className="h-7 w-7 shrink-0" />}
    </button>
  );
}
