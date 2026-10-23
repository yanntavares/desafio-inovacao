"use client";

import { useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { DetalheJornada, HistoricoDocumentacao, TipoDocumento } from "@/lib/tipos";
import { TIPO_DOCUMENTO } from "./HistoricoDocumentos";

interface PainelProximoPassoProps {
  jornada: DetalheJornada;
  documentos: HistoricoDocumentacao;
  /** Recarrega o lead depois de uma ação. */
  aoAgir: () => void;
  /** Abre o documento ao lado (recém-gerado ou o último da versão). */
  aoAbrirDocumento: (documentoId: number) => void;
}

const BOTAO =
  "h-12 rounded-lg bg-azul px-4 font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-60";

/** O que a pessoa pode fazer agora no lead, conforme o estado da jornada (faixa "próxima ação" das user stories). */
export function PainelProximoPasso({ jornada, documentos, aoAgir, aoAbrirDocumento }: PainelProximoPassoProps) {
  const { sessao } = useAuth();
  const { token, usuario } = sessao!;
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function agir(acao: () => Promise<unknown>, falha: string) {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
      aoAgir();
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : falha);
    } finally {
      setOcupado(false);
    }
  }

  const ehAnalista = usuario.papel === "comercial" && usuario.id === jornada.analista.id;
  const ehGerente = usuario.papel === "gerente" && usuario.id === jornada.gerente?.id;
  const ultimo = (tipo: TipoDocumento) =>
    documentos.documentos.filter((d) => d.tipo === tipo).sort((a, b) => b.versao - a.versao)[0];

  // Gera (nova versão) ou abre o último; quem pode gerar é conferido de novo pela API.
  function botoesDocumento(tipos: TipoDocumento[]) {
    return (
      <div className="flex flex-col gap-2">
        {tipos.map((tipo) => {
          const doc = ultimo(tipo);
          return (
            <div key={tipo} className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  agir(async () => aoAbrirDocumento((await apiJornadas.gerarDocumento(token, jornada.id, tipo)).id),
                    "Não foi possível gerar o documento. Tente de novo.")
                }
                className={BOTAO}
              >
                {doc ? `Gerar nova versão: ${TIPO_DOCUMENTO[tipo]}` : `Gerar ${TIPO_DOCUMENTO[tipo].toLowerCase()}`}
              </button>
              {doc && (
                <button
                  type="button"
                  onClick={() => aoAbrirDocumento(doc.id)}
                  className="h-12 rounded-lg px-3 font-bold text-azul underline underline-offset-4 hover:text-azul-escuro"
                >
                  Abrir v{doc.versao} ({doc.status === "aprovado" ? "aprovado" : "rascunho"})
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Quem cadastra reunião (analista dono ou gerente) também pede nova tentativa; a API confere o resto.
  const podeTentarDeNovo =
    usuario.papel === "gerente" || (usuario.papel === "comercial" && usuario.id === jornada.analista.id);

  let titulo: string;
  let corpo: React.ReactNode;
  switch (jornada.estado) {
    case "TRANSCRICAO_RECEBIDA":
    case "EXTRAINDO":
      titulo = "Extraindo a ficha";
      corpo = (
        <p role="status" className="text-[15px] text-cinza">
          A IA está organizando a transcrição em segundo plano. Esta página se atualiza sozinha e você pode fechá-la: ao
          terminar, o lead vai para Em validação.
        </p>
      );
      break;
    case "FALHA_EXTRACAO":
      titulo = "A extração falhou";
      corpo = (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-cinza">Não foi possível extrair. Sua transcrição está preservada.</p>
          <button
            type="button"
            disabled={!podeTentarDeNovo || ocupado}
            onClick={() => agir(() => apiJornadas.tentarExtracaoDeNovo(token, jornada.id), "Não foi possível tentar de novo. Tente outra vez.")}
            className="h-14 rounded-lg bg-azul text-lg font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ocupado ? "Enviando…" : "Tentar de novo"}
          </button>
          {!podeTentarDeNovo && (
            <p className="text-sm text-cinza">Só o analista responsável ou o gerente pedem uma nova tentativa.</p>
          )}
        </div>
      );
      break;
    case "EM_VALIDACAO":
    case "VALIDADA":
      if (!ehAnalista) return null;
      titulo = "Documentos comerciais";
      corpo = (
        <>
          <p className="text-[15px] text-cinza">Gerados só a partir dos itens confirmados; revise e aprove antes de enviar.</p>
          {botoesDocumento(["resumo_comercial", "briefing_comercial"])}
        </>
      );
      break;
    case "ACEITO":
    case "BRIEFING_APROVADO": {
      const aprovado = jornada.estado === "BRIEFING_APROVADO";
      titulo = aprovado ? "Pauta de kickoff" : "Briefing de projeto (G4)";
      if (!ehGerente) {
        corpo = (
          <p className="rounded-lg bg-azul-suave px-4 py-3 text-[15px] font-semibold text-azul-escuro">
            {aprovado
              ? `Briefing aprovado. ${jornada.gerente?.nome ?? "O gerente"} prepara a pauta e conclui a jornada após o kickoff.`
              : `Aguardando ${jornada.gerente?.nome ?? "o gerente designado"} gerar e aprovar o briefing de projeto (G4).`}{" "}
            Os documentos abrem no Histórico de documentação.
          </p>
        );
        break;
      }
      const pauta = ultimo("pauta_kickoff");
      const motivoConcluir = pauta?.status === "aprovado" ? null : "Aprove a pauta de kickoff antes de concluir.";
      corpo = aprovado ? (
        <>
          {botoesDocumento(["pauta_kickoff"])}
          <button
            type="button"
            disabled={ocupado || !!motivoConcluir}
            onClick={() => agir(() => apiJornadas.concluir(token, jornada.id), "Não foi possível concluir. Tente de novo.")}
            className="h-14 rounded-lg bg-lima text-lg font-bold text-azul-escuro transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lima/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Concluir jornada
          </button>
          {motivoConcluir && <p className="text-sm text-cinza">{motivoConcluir}</p>}
        </>
      ) : (
        <>
          <p className="text-[15px] text-cinza">Gere o briefing a partir do pacote aceito, revise e aprove (G4).</p>
          {botoesDocumento(["briefing_projeto"])}
        </>
      );
      break;
    }
    default:
      return null;
  }

  return (
    <section className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-[0_2px_4px_rgba(15,27,45,0.06)]">
      <h2 className="text-2xl font-bold text-azul-escuro">{titulo}</h2>
      <div className="mt-3 flex flex-col gap-3">
        {corpo}
        <AlertaErro mensagem={erro} />
      </div>
    </section>
  );
}
