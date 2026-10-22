import { IconeCheck } from "@/components/icones";
import { formatarData } from "@/lib/formato";
import { iniciais } from "@/lib/rotas";
import type { DetalheJornada } from "@/lib/tipos";

interface HeaderJornadaProps {
  jornada: DetalheJornada;
  /** Soma das reuniões; null enquanto carrega. */
  dadosMascarados: number | null;
}

function Cartao({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-24 items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-[0_2px_4px_rgba(15,27,45,0.06)]">
      {children}
    </div>
  );
}

function Stepper({ etapas }: { etapas: DetalheJornada["etapas"] }) {
  return (
    <ol className="flex overflow-x-auto pb-1">
      {etapas.map(({ etapa, situacao }, i) => (
        <li key={etapa} className="relative flex min-w-24 flex-1 flex-col items-center text-center">
          {i > 0 && (
            <span
              aria-hidden
              className={`absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2 ${
                situacao === "futura" ? "bg-slate-200" : "bg-emerald-700"
              }`}
            />
          )}
          <span
            className={`relative z-[1] grid h-8 w-8 place-items-center rounded-full border-2 ${
              situacao === "feita"
                ? "border-emerald-700 bg-emerald-700 text-white"
                : situacao === "atual"
                  ? "border-azul bg-white"
                  : "border-slate-300 bg-white"
            }`}
          >
            {situacao === "feita" && <IconeCheck className="h-4 w-4" />}
            {situacao === "atual" && <span className="h-3 w-3 rounded-full bg-azul" />}
          </span>
          <span
            aria-current={situacao === "atual" ? "step" : undefined}
            className={`mt-2 text-sm ${situacao === "atual" ? "font-bold text-azul-escuro" : situacao === "feita" ? "text-tinta" : "text-cinza"}`}
          >
            {etapa}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function HeaderJornada({ jornada, dadosMascarados }: HeaderJornadaProps) {
  const etapaAtual = jornada.etapas.find((e) => e.situacao === "atual")?.etapa;
  const { reunioes, completude } = jornada;

  return (
    <header className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-azul-escuro lg:text-4xl">{jornada.cliente}</h1>
          {etapaAtual && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-azul-suave px-3 py-1 text-sm font-semibold text-azul">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-azul" />
              {etapaAtual}
            </span>
          )}
          {jornada.estado === "EXTRAINDO" && (
            <span className="rounded-full bg-azul-suave px-3 py-1 text-sm font-semibold text-azul">Extraindo…</span>
          )}
          {jornada.estado === "FALHA_EXTRACAO" && (
            <span
              title="A extração falhou depois de 2 reparos. O analista pode tentar de novo."
              className="rounded-full bg-perigo-suave px-3 py-1 text-sm font-semibold text-perigo"
            >
              Falha na extração
            </span>
          )}
          {dadosMascarados !== null && dadosMascarados > 0 && (
            <span
              title="E-mails, telefones, CPFs e CNPJs são mascarados antes de ir à IA."
              className="rounded-full bg-lima-suave px-3 py-1 text-sm font-semibold text-azul-escuro"
            >
              {dadosMascarados === 1 ? "1 dado pessoal mascarado" : `${dadosMascarados} dados pessoais mascarados`}
            </span>
          )}
        </div>
        <p className="mt-2 text-[17px] text-cinza">
          {jornada.titulo} · lead desde {formatarData(jornada.lead_desde)}
        </p>
      </div>

      {jornada.devolucao && (
        <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-[15px] text-amber-900">
          <p className="font-bold">Handoff devolvido pelo gerente em {formatarData(jornada.devolucao.quando)}</p>
          <p className="mt-1">{jornada.devolucao.comentario}</p>
        </div>
      )}

      <Stepper etapas={jornada.etapas} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Cartao>
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-bold ${
              jornada.gerente ? "bg-lima text-azul-escuro" : "bg-slate-100 text-cinza"
            }`}
          >
            {jornada.gerente ? iniciais(jornada.gerente.nome) : "—"}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-cinza">Gerente alocado</p>
            <p className="truncate text-lg font-bold text-tinta">{jornada.gerente?.nome ?? "Definido no envio do handoff"}</p>
          </div>
        </Cartao>
        <Cartao>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-azul-suave text-base font-bold text-azul-escuro">
            {jornada.analista.iniciais}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-cinza">Analista responsável</p>
            <p className="truncate text-lg font-bold text-tinta">{jornada.analista.nome}</p>
          </div>
        </Cartao>
        <Cartao>
          <div>
            <p className="text-sm font-semibold text-cinza">Reuniões</p>
            <p className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-azul-escuro">{reunioes.total}</span>
              {reunioes.ultima && <span className="text-[15px] text-cinza">última em {formatarData(reunioes.ultima, false)}</span>}
            </p>
          </div>
        </Cartao>
        <Cartao>
          <div className="w-full">
            <p className="text-sm font-semibold text-cinza">Completude do handoff</p>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-3xl font-bold text-[#9aa81f]">{completude.percentual}%</span>
              <div
                role="progressbar"
                aria-label={`${completude.preenchidas} de ${completude.total} seções preenchidas`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completude.percentual}
                className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
              >
                <div className="h-full rounded-full bg-lima" style={{ width: `${completude.percentual}%` }} />
              </div>
            </div>
          </div>
        </Cartao>
      </div>
    </header>
  );
}
