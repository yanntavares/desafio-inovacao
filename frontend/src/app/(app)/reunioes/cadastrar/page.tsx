"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { BotaoPrimario } from "@/components/formulario/BotaoPrimario";
import { CampoSelecao } from "@/components/formulario/CampoSelecao";
import { CampoTexto } from "@/components/formulario/CampoTexto";
import { GrupoAlternancia } from "@/components/formulario/GrupoAlternancia";
import { CampoParticipantes } from "@/components/reuniao/CampoParticipantes";
import { CheckListObrigatorios, type Obrigatorio } from "@/components/reuniao/CheckListObrigatorios";
import { AvisoPrivacidade, OQueAconteceDepois } from "@/components/reuniao/PainelLateralReuniao";
import {
  UploadTranscricao,
  type EstadoPrevia,
  type ModoTranscricao,
} from "@/components/reuniao/UploadTranscricao";
import { apiReunioes, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { rotaInicial } from "@/lib/rotas";
import type { LeadOpcao, Participante, TipoReuniao, UsuarioOpcao } from "@/lib/tipos";

type ModoLead = "existente" | "novo";

const ROTULO_TIPO: Record<TipoReuniao, string> = {
  exploratoria: "Exploratória (1ª reunião)",
  aprofundamento: "Aprofundamento",
  alinhamento: "Alinhamento",
  fechamento: "Fechamento",
};

// Espera o usuário parar de colar/digitar antes de pedir a pré-visualização.
const ATRASO_PREVIA_MS = 800;

function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mensagemDe(erro: unknown, padrao: string): string {
  return erro instanceof ErroApi ? erro.message : padrao;
}

export default function CadastrarReuniaoPage() {
  const router = useRouter();
  const { sessao } = useAuth();
  // O layout (app) só renderiza a página com sessão; o "!" reflete essa garantia.
  const { token, usuario } = sessao!;
  const ehAnalista = usuario.papel === "comercial";

  const [leads, setLeads] = useState<LeadOpcao[]>([]);
  const [tipos, setTipos] = useState<TipoReuniao[]>([]);
  const [analistas, setAnalistas] = useState<UsuarioOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modoLead, setModoLead] = useState<ModoLead>("existente");
  const [leadId, setLeadId] = useState<number | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [tituloNegocio, setTituloNegocio] = useState("");
  const [analistaEscolhido, setAnalistaEscolhido] = useState<number | null>(ehAnalista ? usuario.id : null);
  const [dataReuniao, setDataReuniao] = useState(hojeIso);
  const [tipo, setTipo] = useState<TipoReuniao | "">("");
  const [participantes, setParticipantes] = useState<Participante[]>(
    ehAnalista ? [{ nome: usuario.nome, cliente: false }] : [],
  );

  const [modoTranscricao, setModoTranscricao] = useState<ModoTranscricao>("arquivo");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState<EstadoPrevia>({ tipo: "vazio" });
  const sequenciaPrevia = useRef(0);
  const temporizador = useRef<number | undefined>(undefined);

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([apiReunioes.opcoes(token), apiReunioes.usuarios(token)])
      .then(([opcoes, usuarios]) => {
        if (!ativo) return;
        setLeads(opcoes.leads);
        setTipos(opcoes.tipos);
        setAnalistas(usuarios.filter((u) => u.papel === "comercial"));
        if (!opcoes.leads.some((l) => l.aceita_reuniao)) setModoLead("novo");
      })
      .catch((e: unknown) => ativo && setErro(mensagemDe(e, "Não foi possível carregar as opções. Recarregue a página.")))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [token]);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const lead = modoLead === "existente" ? (leads.find((l) => l.id === leadId) ?? null) : null;
  // A API exige que a reunião de um lead existente fique com o analista do lead.
  const analistaId = lead ? lead.responsavel_id : analistaEscolhido;
  const opcoesAnalista = ehAnalista ? [{ id: usuario.id, nome: usuario.nome, papel: usuario.papel }] : analistas;
  const ajudaAnalista = ehAnalista
    ? "Analistas cadastram reuniões só para si."
    : lead
      ? "Definido pelo lead escolhido: a reunião fica com o analista responsável por ele."
      : null;

  // --- transcrição ---------------------------------------------------------------

  function verificar(conteudo: File | string) {
    window.clearTimeout(temporizador.current);
    const vazio = typeof conteudo === "string" && !conteudo.trim();
    const minhaVez = ++sequenciaPrevia.current; // descarta respostas de conteúdos já trocados
    if (vazio) {
      setPrevia({ tipo: "vazio" });
      return;
    }
    setPrevia({ tipo: "verificando" });
    const dados = new FormData();
    if (typeof conteudo === "string") dados.append("texto", conteudo);
    else dados.append("arquivo", conteudo);
    apiReunioes
      .preVisualizar(token, dados)
      .then((r) => minhaVez === sequenciaPrevia.current && setPrevia({ tipo: "valido", dados: r }))
      .catch(
        (e: unknown) =>
          minhaVez === sequenciaPrevia.current &&
          setPrevia({ tipo: "invalido", mensagem: mensagemDe(e, "Não foi possível verificar a transcrição.") }),
      );
  }

  function escolherArquivo(novo: File | null) {
    if (!novo) return;
    setArquivo(novo);
    verificar(novo);
  }

  function mudarTexto(valor: string) {
    setTexto(valor);
    window.clearTimeout(temporizador.current);
    if (!valor.trim()) {
      verificar(valor);
      return;
    }
    setPrevia({ tipo: "verificando" });
    temporizador.current = window.setTimeout(() => verificar(valor), ATRASO_PREVIA_MS);
  }

  function mudarModoTranscricao(modo: ModoTranscricao) {
    setModoTranscricao(modo);
    if (modo === "arquivo") {
      if (arquivo) verificar(arquivo);
      else verificar("");
    } else {
      verificar(texto);
    }
  }

  // --- lead ----------------------------------------------------------------------

  function escolherLead(valor: string) {
    const escolhido = leads.find((l) => l.id === Number(valor)) ?? null;
    setLeadId(escolhido?.id ?? null);
    if (escolhido) setTituloNegocio(escolhido.titulo);
  }

  function mudarModoLead(modo: ModoLead) {
    setModoLead(modo);
    setTituloNegocio(modo === "existente" ? (leads.find((l) => l.id === leadId)?.titulo ?? "") : "");
  }

  // --- validação -----------------------------------------------------------------

  const obrigatorios: Obrigatorio[] = [
    { rotulo: "Analista responsável", ok: analistaId !== null },
    { rotulo: "Nome do lead", ok: modoLead === "existente" ? lead !== null : clienteNome.trim().length > 0 },
    { rotulo: "Data", ok: dataReuniao.length > 0 },
    { rotulo: "Nome do negócio", ok: tituloNegocio.trim().length > 0 },
    { rotulo: "Participantes", ok: participantes.length > 0 },
    { rotulo: "Transcrição ou doc.", ok: previa.tipo === "valido" },
    { rotulo: "Tipo da reunião", ok: tipo !== "" },
  ];
  const faltando = obrigatorios.filter((o) => !o.ok).map((o) => o.rotulo);

  let motivoBloqueio: string | null = null;
  if (carregando) motivoBloqueio = "Carregando as opções do formulário…";
  else if (previa.tipo === "verificando") motivoBloqueio = "Aguarde a verificação da transcrição.";
  else if (previa.tipo === "invalido") motivoBloqueio = "Corrija a transcrição: ela não passou na verificação.";
  else if (faltando.length > 0) motivoBloqueio = `Preencha: ${faltando.join(", ")}.`;

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (motivoBloqueio || analistaId === null || tipo === "") return;
    setErro(null);

    const dados = new FormData();
    if (lead) dados.append("jornada_id", String(lead.id));
    else dados.append("cliente_nome", clienteNome.trim());
    dados.append("titulo_negocio", tituloNegocio.trim());
    dados.append("analista_id", String(analistaId));
    dados.append("data_reuniao", dataReuniao);
    dados.append("tipo", tipo);
    dados.append("participantes", JSON.stringify(participantes));
    if (modoTranscricao === "arquivo" && arquivo) dados.append("arquivo", arquivo);
    else dados.append("texto", texto);

    setEnviando(true);
    try {
      const criada = await apiReunioes.cadastrar(token, dados);
      router.push(`/jornadas/${criada.jornada_id}`);
    } catch (e) {
      setErro(mensagemDe(e, "Não foi possível cadastrar a reunião. Tente de novo."));
      setEnviando(false);
    }
  }

  const leadsAbertos = leads.filter((l) => l.aceita_reuniao);

  return (
    <section>
      <h1 className="text-4xl font-extrabold text-azul-escuro">Cadastrar reunião</h1>
      <p className="mt-2 text-lg text-cinza">
        Envie a transcrição ou a documentação. A IA organiza e você valida antes de seguir.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:gap-8">
        <form
          onSubmit={enviar}
          noValidate
          className="space-y-9 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_10px_rgba(15,27,45,0.08)] sm:p-10"
        >
          <fieldset className="space-y-6">
            <legend className="mb-6 text-2xl font-bold text-azul-escuro">1. Lead e negócio</legend>
            <GrupoAlternancia
              rotulo="Origem do lead"
              valor={modoLead}
              aoMudar={mudarModoLead}
              opcoes={[
                { valor: "existente", rotulo: "Lead existente no kanban" },
                { valor: "novo", rotulo: "Novo lead" },
              ]}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {modoLead === "existente" ? (
                <CampoSelecao
                  rotulo="Nome do lead *"
                  value={leadId ?? ""}
                  onChange={(e) => escolherLead(e.target.value)}
                  disabled={carregando || leadsAbertos.length === 0}
                  ajuda={
                    !carregando && leadsAbertos.length === 0
                      ? "Nenhum lead aceita novas reuniões. Use “Novo lead”."
                      : null
                  }
                >
                  <option value="">{carregando ? "Carregando…" : "Selecione o lead"}</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id} disabled={!l.aceita_reuniao}>
                      {l.cliente} — {l.titulo}
                      {l.aceita_reuniao ? "" : " (já enviado ao gerente)"}
                    </option>
                  ))}
                </CampoSelecao>
              ) : (
                <CampoTexto
                  tom="sobreBranco"
                  rotulo="Nome do lead *"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Ex.: Instituto Horizonte"
                  maxLength={200}
                />
              )}
              <CampoTexto
                tom="sobreBranco"
                rotulo="Nome do negócio *"
                value={tituloNegocio}
                onChange={(e) => setTituloNegocio(e.target.value)}
                placeholder="Ex.: Plataforma de cursos online"
                maxLength={200}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-5">
            <legend className="mb-6 text-2xl font-bold text-azul-escuro">2. Dados da reunião</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <CampoSelecao
                rotulo="Analista responsável *"
                value={analistaId ?? ""}
                onChange={(e) => setAnalistaEscolhido(e.target.value ? Number(e.target.value) : null)}
                disabled={ehAnalista || lead !== null || carregando}
                ajuda={ajudaAnalista}
              >
                <option value="">Selecione o analista</option>
                {opcoesAnalista.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </CampoSelecao>
              <CampoTexto
                tom="sobreBranco"
                type="date"
                rotulo="Data da reunião *"
                value={dataReuniao}
                onChange={(e) => setDataReuniao(e.target.value)}
              />
              <CampoSelecao
                rotulo="Tipo da reunião *"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoReuniao | "")}
                disabled={carregando}
              >
                <option value="">Selecione o tipo</option>
                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {ROTULO_TIPO[t] ?? t}
                  </option>
                ))}
              </CampoSelecao>
              <CampoParticipantes participantes={participantes} aoMudar={setParticipantes} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-6 text-2xl font-bold text-azul-escuro">3. Transcrição ou documentação *</legend>
            <UploadTranscricao
              modo={modoTranscricao}
              aoMudarModo={mudarModoTranscricao}
              arquivo={arquivo}
              aoEscolherArquivo={escolherArquivo}
              texto={texto}
              aoMudarTexto={mudarTexto}
              previa={previa}
            />
          </fieldset>

          <AlertaErro mensagem={erro} />

          <div>
            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push(rotaInicial(usuario.papel))}
                className="h-14 rounded-lg border border-slate-300 bg-white px-16 text-lg font-bold text-tinta transition hover:border-azul/50 hover:bg-azul-suave/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30"
              >
                Cancelar
              </button>
              <BotaoPrimario
                type="submit"
                carregando={enviando}
                textoCarregando="Cadastrando…"
                disabled={motivoBloqueio !== null}
                aria-describedby={motivoBloqueio ? "motivo-bloqueio" : undefined}
                className="sm:w-auto sm:px-16"
              >
                Cadastrar e processar
              </BotaoPrimario>
            </div>
            {motivoBloqueio && (
              <p id="motivo-bloqueio" className="mt-3 text-right text-sm text-cinza">
                {motivoBloqueio}
              </p>
            )}
          </div>
        </form>

        <div className="space-y-6">
          <OQueAconteceDepois />
          <CheckListObrigatorios itens={obrigatorios} />
          <AvisoPrivacidade />
        </div>
      </div>
    </section>
  );
}
