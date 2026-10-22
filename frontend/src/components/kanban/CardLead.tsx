import Link from "next/link";
import type { CardLead as DadosCard } from "@/lib/tipos";

// Depois da validação (G2) a completude já foi revisada por pessoa: a barra fica verde.
const ESTADOS_ANTES_DA_VALIDACAO = new Set([
  "CRIADA",
  "TRANSCRICAO_RECEBIDA",
  "EXTRAINDO",
  "FALHA_EXTRACAO",
  "EM_VALIDACAO",
]);

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function CardLead({ card }: { card: DadosCard }) {
  const validado = !ESTADOS_ANTES_DA_VALIDACAO.has(card.estado);
  const temBloqueio = card.bloqueantes > 0;

  return (
    <Link
      href={`/jornadas/${card.id}`}
      className={`block rounded-xl border-2 bg-white p-4 shadow-[0_1px_2px_rgba(15,27,45,0.06)] transition hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30 ${
        temBloqueio ? "border-lima" : "border-transparent"
      }`}
    >
      <p className="font-bold leading-tight text-tinta">{card.cliente}</p>
      <p className="mt-1 truncate text-sm text-cinza">{card.titulo}</p>

      <div className="mt-3 flex items-center gap-2 text-[15px] text-tinta">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-azul-suave text-[11px] font-bold text-azul-escuro">
          {card.analista.iniciais}
        </span>
        <span title={card.analista.nome}>{primeiroNome(card.analista.nome)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-tinta">{card.reunioes} reun.</span>
        {temBloqueio && (
          <span
            title={`${card.bloqueantes} pendência(s) bloqueante(s) aberta(s): impedem a validação (G2).`}
            className="rounded-full bg-lima px-2.5 py-1 text-azul-escuro"
          >
            {card.bloqueantes} bloq.
          </span>
        )}
        {card.extraindo && <span className="rounded-full bg-azul-suave px-2.5 py-1 text-azul">Extraindo…</span>}
        {card.falha_extracao && (
          <span
            title="A extração falhou. Abra o lead para tentar de novo."
            className="rounded-full bg-perigo-suave px-2.5 py-1 text-perigo"
          >
            Falha na extração
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Completude do pacote"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={card.completude}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className={`h-full rounded-full ${validado ? "bg-emerald-700" : "bg-azul"}`}
            style={{ width: `${card.completude}%` }}
          />
        </div>
        <span className="w-10 text-right text-xs font-semibold text-tinta">{card.completude}%</span>
      </div>
    </Link>
  );
}
