"use client";

import { useEffect, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { IconeCadeado } from "@/components/icones";
import { apiJornadas, apiReunioes, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { DetalheJornada, EstadoJornada, UsuarioOpcao } from "@/lib/tipos";
import type { DecisaoG3 } from "./ModalDecisaoGateG3";

const DEPOIS_DO_ACEITE: EstadoJornada[] = ["ACEITO", "BRIEFING_APROVADO", "CONCLUIDA"];

interface PainelHandoffGateProps {
  jornada: DetalheJornada;
  aoDecidir: (decisao: DecisaoG3) => void;
  aoEnviar: () => void;
}

/** Analista responsável, com a jornada validada (G2): gera o snapshot e envia ao gerente. */
function EnvioHandoff({ jornada, aoEnviar }: { jornada: DetalheJornada; aoEnviar: () => void }) {
  const { sessao } = useAuth();
  const [gerentes, setGerentes] = useState<UsuarioOpcao[]>([]);
  const [gerenteId, setGerenteId] = useState<number | null>(jornada.gerente?.id ?? null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    apiReunioes
      .usuarios(sessao!.token)
      .then((us) => ativo && setGerentes(us.filter((u) => u.papel === "gerente")))
      .catch(() => ativo && setErro("Não foi possível carregar os gerentes. Recarregue a página."));
    return () => {
      ativo = false;
    };
  }, [sessao]);

  async function enviar() {
    if (!gerenteId) return;
    setEnviando(true);
    setErro(null);
    try {
      await apiJornadas.enviarHandoff(sessao!.token, jornada.id, gerenteId);
      aoEnviar();
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível enviar o handoff. Tente de novo.");
      setEnviando(false);
    }
  }

  const motivo = gerenteId ? null : "Escolha o gerente de projetos que vai receber o pacote.";
  return (
    <div className="mt-5 flex flex-col gap-3">
      <label className="text-sm font-semibold text-tinta">
        Gerente de projetos
        <select
          value={gerenteId ?? ""}
          onChange={(e) => setGerenteId(e.target.value ? Number(e.target.value) : null)}
          className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-normal focus:border-azul focus:outline-none focus:ring-4 focus:ring-azul/20"
        >
          <option value="">Selecione…</option>
          {gerentes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </select>
      </label>
      <AlertaErro mensagem={erro} />
      <button
        type="button"
        onClick={enviar}
        disabled={!!motivo || enviando}
        className="h-14 rounded-lg bg-azul text-lg font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviar handoff ao gerente"}
      </button>
      {motivo && <p className="text-sm text-cinza">{motivo}</p>}
    </div>
  );
}

export function PainelHandoffGate({ jornada, aoDecidir, aoEnviar }: PainelHandoffGateProps) {
  const { sessao } = useAuth();
  const { usuario } = sessao!;
  const pacote = jornada.handoff;
  const g3 = jornada.gates.G3;
  const aguardandoAceite = jornada.estado === "HANDOFF_ENVIADO";
  const aceito = DEPOIS_DO_ACEITE.includes(jornada.estado);
  // Gerente e Diretoria veem os botões; quem decide é a API (só o gerente designado passa).
  const veBotoes = aguardandoAceite && (usuario.papel === "gerente" || usuario.papel === "admin");
  const podeEnviar =
    jornada.estado === "VALIDADA" && usuario.papel === "comercial" && usuario.id === jornada.analista.id;

  const r = pacote?.resumo;
  const percentual = r ? Math.round((100 * r.secoes_preenchidas) / r.secoes_total) : 0;

  return (
    <section
      className={`rounded-xl border-2 bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)] ${
        aguardandoAceite ? "border-azul" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-bold text-azul-escuro">
          {!pacote ? "Handoff" : aceito ? "Handoff aceito" : pacote.versao > 1 ? "Handoff atualizado" : "Handoff enviado"}
        </h2>
        {pacote && <span className="rounded-full bg-azul-escuro px-3 py-1 text-sm font-bold text-white">v{pacote.versao}</span>}
      </div>

      {!pacote || !r ? (
        <p className="mt-2 text-[15px] text-cinza">
          {jornada.estado === "VALIDADA"
            ? "Ficha validada (G2). O pacote é gerado no envio ao gerente."
            : "O pacote de handoff é gerado depois da validação (G2)."}
        </p>
      ) : (
        <>
          <p className="mt-1 text-[15px] text-cinza">Snapshot imutável · só nova versão altera</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              [r.acordados, "acordados", "text-emerald-700"],
              [r.em_discussao, "em discussão", "text-[#9aa81f]"],
              [r.bloqueantes, "bloqueantes", r.bloqueantes > 0 ? "text-perigo" : "text-[#9aa81f]"],
            ].map(([n, rotulo, cor]) => (
              <div key={rotulo} className="rounded-lg bg-fundo px-3 py-3">
                <p className={`text-3xl font-bold ${cor}`}>{n}</p>
                <p className="text-sm text-cinza">{rotulo}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between text-[15px]">
            <span className="font-semibold text-tinta">Seções do pacote</span>
            <span className="font-semibold text-[#9aa81f]">
              {r.secoes_preenchidas} de {r.secoes_total}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-lima" style={{ width: `${percentual}%` }} />
          </div>
          {r.faltam.length > 0 && (
            <p className="mt-3 text-sm text-azul">
              <span aria-hidden>▲ </span>Faltam: {r.faltam.map((f) => f.toLowerCase()).join(", ")}
            </p>
          )}
        </>
      )}

      {usuario.papel === "admin" && (
        <p className="mt-5 flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-tinta">
          <IconeCadeado className="h-4 w-4 shrink-0" />
          Perfil Diretoria não aprova nada por outra pessoa.
        </p>
      )}

      {pacote && veBotoes && (
        <div className="mt-5 flex flex-col gap-3">
          {g3.liberado && (
            <p className="rounded-lg bg-lima-suave px-4 py-3 font-bold text-azul-escuro">
              Você aceita a versão v{pacote.versao} (G3)
            </p>
          )}
          <button
            type="button"
            onClick={() => aoDecidir("aceitar")}
            disabled={!g3.liberado}
            className="h-14 rounded-lg bg-lima text-lg font-bold text-azul-escuro transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lima/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aceitar handoff
          </button>
          <button
            type="button"
            onClick={() => aoDecidir("devolver")}
            disabled={!g3.liberado}
            className="h-14 rounded-lg border-2 border-azul-escuro text-lg font-bold text-azul-escuro transition hover:bg-azul-suave focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Devolver ao analista
          </button>
          {!g3.liberado && g3.motivo && <p className="text-sm text-cinza">{g3.motivo}</p>}
        </div>
      )}

      {aguardandoAceite && !veBotoes && (
        <p className="mt-5 rounded-lg bg-azul-suave px-4 py-3 text-[15px] font-semibold text-azul-escuro">
          Aguardando aceite de {jornada.gerente?.nome ?? "o gerente designado"} (G3).
        </p>
      )}
      {aceito && pacote && (
        <p className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-[15px] font-semibold text-emerald-800">
          Versão v{pacote.versao} aceita por {jornada.gerente?.nome ?? "o gerente"} (G3).
        </p>
      )}
      {jornada.estado === "EM_VALIDACAO" && usuario.papel === "comercial" && (
        <p className="mt-5 text-sm text-cinza">
          {jornada.gates.G2.motivo ?? "Ficha pronta: aprove a validação (G2) para gerar o pacote."}
        </p>
      )}
      {podeEnviar && <EnvioHandoff jornada={jornada} aoEnviar={aoEnviar} />}
    </section>
  );
}
