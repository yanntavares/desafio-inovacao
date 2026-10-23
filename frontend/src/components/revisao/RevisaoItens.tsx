"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { apiJornadas, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { CategoriaItem, Evidencia, ItemRevisao, ReuniaoCompleta, StatusValidacao } from "@/lib/tipos";
import { useLeitura } from "@/lib/useLeitura";
import { ItemRevisaoLinha } from "./ItemRevisaoLinha";
import { NovoItem } from "./NovoItem";
import { type Destaque, Transcricao } from "./Transcricao";

type Filtro = "todos" | StatusValidacao;

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "pendente", rotulo: "Pendentes" },
  { valor: "confirmado", rotulo: "Confirmados" },
  { valor: "editado", rotulo: "Editados" },
  { valor: "rejeitado", rotulo: "Rejeitados" },
];

type Trecho =
  | { tipo: "nenhum" }
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; evidencia: Evidencia; reuniao: ReuniaoCompleta | null };

export function RevisaoItens({ id }: { id: number }) {
  const { sessao } = useAuth();
  const { token, usuario } = sessao!;
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [aberto, setAberto] = useState<number | null>(null);
  const [trecho, setTrecho] = useState<Trecho>({ tipo: "nenhum" });
  const reunioes = useRef(new Map<number, ReuniaoCompleta>());

  const carregar = useCallback(async () => {
    const [jornada, visao, itens] = await Promise.all([
      apiJornadas.detalhe(token, id),
      apiJornadas.visaoGeral(token, id),
      apiJornadas.itens(token, id),
    ]);
    return { jornada, visao, itens };
  }, [token, id]);
  const { dados, erro, recarregar } = useLeitura(`revisao:${token}:${id}`, carregar, { intervaloMs: 30_000 });

  async function selecionar(item: ItemRevisao) {
    if (aberto === item.id) {
      setAberto(null);
      setTrecho({ tipo: "nenhum" });
      return;
    }
    setAberto(item.id);
    setTrecho({ tipo: "carregando" });
    try {
      const evidencia = await apiJornadas.evidencia(token, item.id);
      const reuniaoId = evidencia.evidencias[0]?.reuniao_id;
      let reuniao: ReuniaoCompleta | null = null;
      if (reuniaoId) {
        reuniao = reunioes.current.get(reuniaoId) ?? (await apiJornadas.reuniao(token, reuniaoId));
        reunioes.current.set(reuniaoId, reuniao);
      }
      setTrecho({ tipo: "pronto", evidencia, reuniao });
    } catch (e: unknown) {
      setTrecho({ tipo: "erro", mensagem: e instanceof ErroApi ? e.message : "Não foi possível carregar o trecho. Tente de novo." });
    }
  }

  function aposRevisar() {
    setAberto(null);
    setTrecho({ tipo: "nenhum" });
    recarregar();
  }

  if (!dados) {
    return erro ? (
      <AlertaErro mensagem={erro} />
    ) : (
      <p role="status" className="py-10 text-center text-sm text-cinza">
        Carregando itens…
      </p>
    );
  }

  const { jornada, visao, itens } = dados;
  const categorias = Object.entries(visao.secoes).map(([valor, s]) => ({ valor: valor as CategoriaItem, titulo: s.titulo }));
  const contagem = (s: StatusValidacao) => itens.filter((i) => i.status_validacao === s).length;

  // Motivo escrito de por que a pessoa só lê (a API recusa de qualquer forma).
  const motivoSemAcao =
    jornada.estado !== "EM_VALIDACAO"
      ? "Os itens só podem ser alterados com a jornada em validação."
      : usuario.papel !== "comercial" || usuario.id !== jornada.analista.id
        ? "Só o analista responsável por este lead revisa os itens."
        : null;

  const visiveis = itens.filter((i) => filtro === "todos" || i.status_validacao === filtro);
  const destaques: Destaque[] =
    trecho.tipo === "pronto"
      ? trecho.evidencia.evidencias.map((e) => ({ segmento: e.segmento_ordem, inicio: e.inicio, fim: e.fim }))
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-azul-escuro lg:text-4xl">Revisão dos itens</h1>
          <p className="mt-2 text-[17px] text-cinza">
            {jornada.cliente} · {jornada.titulo}
          </p>
        </div>
        <Link
          href={`/jornadas/${jornada.id}`}
          className="inline-flex h-11 items-center rounded-lg border-2 border-azul px-5 font-bold text-azul transition hover:bg-azul-suave focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30"
        >
          Voltar ao lead
        </Link>
      </div>

      {motivoSemAcao && (
        <p role="status" className="rounded-xl bg-lima-suave px-5 py-4 text-[15px] font-semibold text-azul-escuro">
          Somente leitura. {motivoSemAcao}
        </p>
      )}
      <AlertaErro mensagem={erro} />

      <div role="group" aria-label="Filtrar itens por situação" className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const n = f.valor === "todos" ? itens.length : contagem(f.valor);
          const ativo = filtro === f.valor;
          return (
            <button
              key={f.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => setFiltro(f.valor)}
              className={`h-10 rounded-full border-2 px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30 ${
                ativo ? "border-azul bg-azul text-white" : "border-slate-300 bg-white text-tinta hover:border-azul"
              }`}
            >
              {f.rotulo} ({n})
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          {categorias.map((c) => {
            const daSecao = visiveis.filter((i) => i.categoria === c.valor);
            if (daSecao.length === 0) return null;
            return (
              <section key={c.valor} aria-label={c.titulo}>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-cinza">{c.titulo}</h2>
                <ul className="flex flex-col gap-3">
                  {daSecao.map((item) => (
                    <ItemRevisaoLinha
                      key={item.id}
                      item={item}
                      aberto={aberto === item.id}
                      aoAlternar={() => selecionar(item)}
                      motivoSemAcao={motivoSemAcao}
                      categorias={categorias}
                      aoRevisar={aposRevisar}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
          {visiveis.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-cinza">
              Nenhum item {filtro === "todos" ? "nesta ficha" : "nesta situação"}.
            </p>
          )}
          {!motivoSemAcao && <NovoItem jornadaId={jornada.id} categorias={categorias} aoAdicionar={recarregar} />}
        </div>

        <aside
          aria-label="Trecho da transcrição"
          className="rounded-xl border-2 border-slate-300 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto"
        >
          <h2 className="mb-3 text-xl font-bold text-azul-escuro">Transcrição</h2>
          {trecho.tipo === "nenhum" && (
            <p className="text-[15px] text-cinza">Selecione um item para ver o trecho da transcrição que o sustenta.</p>
          )}
          {trecho.tipo === "carregando" && (
            <p role="status" className="text-[15px] text-cinza">
              Carregando trecho…
            </p>
          )}
          {trecho.tipo === "erro" && <AlertaErro mensagem={trecho.mensagem} />}
          {trecho.tipo === "pronto" &&
            (trecho.reuniao ? (
              <Transcricao reuniao={trecho.reuniao} destaques={destaques} />
            ) : (
              <p className="text-[15px] text-cinza">Sem trecho na transcrição: item tratado como inferido.</p>
            ))}
        </aside>
      </div>
    </div>
  );
}
