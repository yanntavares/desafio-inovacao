"use client";

import { useEffect, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { paraId, SelecaoFiltro } from "@/components/formulario/SelecaoFiltro";
import { apiDiretoria, apiReunioes, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { FiltrosPainel, PainelFunil, UsuarioOpcao } from "@/lib/tipos";
import { CartoesMetricas } from "./CartoesMetricas";
import { GraficoFunil } from "./GraficoFunil";
import { ListaProjetos } from "./ListaProjetos";
import { MatrizPermissoes } from "./MatrizPermissoes";
import { RecarregarDemo } from "./RecarregarDemo";
import { TabelaUsuarios } from "./TabelaUsuarios";

const PERIODOS = [
  [7, "Últimos 7 dias"],
  [30, "Últimos 30 dias"],
  [90, "Últimos 90 dias"],
  [0, "Todo o período"],
] as const;

export function PainelDiretoria() {
  const { sessao } = useAuth();
  const token = sessao!.token;
  const [filtros, setFiltros] = useState<FiltrosPainel>({ dias: 30, analista_id: null, gerente_id: null });
  const [painel, setPainel] = useState<PainelFunil | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioOpcao[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Opções dos filtros; falha aqui não impede ver o painel.
  useEffect(() => {
    let ativo = true;
    apiReunioes
      .usuarios(token)
      .then((us) => ativo && setUsuarios(us))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [token]);

  useEffect(() => {
    let ativo = true; // descarta respostas de filtros já trocados
    apiDiretoria
      .painel(token, filtros)
      .then((p) => {
        if (!ativo) return;
        setPainel(p);
        setErro(null);
      })
      .catch((e: unknown) => ativo && setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar o painel. Recarregue a página."));
    return () => {
      ativo = false;
    };
  }, [token, filtros]);

  const analistas = usuarios.filter((u) => u.papel === "comercial");
  const gerentes = usuarios.filter((u) => u.papel === "gerente");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-azul-escuro lg:text-4xl">Visão geral do funil</h1>
          <p className="mt-2 text-[17px] text-cinza">Acompanhe projetos e negócios, gerencie usuários e defina permissões.</p>
        </div>
        <RecarregarDemo />
      </div>

      <div className="flex flex-wrap gap-3">
        <SelecaoFiltro
          rotulo="Período"
          value={filtros.dias}
          onChange={(e) => setFiltros({ ...filtros, dias: Number(e.target.value) })}
        >
          {PERIODOS.map(([dias, rotulo]) => (
            <option key={dias} value={dias}>
              {rotulo}
            </option>
          ))}
        </SelecaoFiltro>
        <SelecaoFiltro
          rotulo="Filtrar por analista"
          value={filtros.analista_id ?? ""}
          onChange={(e) => setFiltros({ ...filtros, analista_id: paraId(e.target.value) })}
        >
          <option value="">Todos os analistas</option>
          {analistas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </SelecaoFiltro>
        <SelecaoFiltro
          rotulo="Filtrar por gerente"
          value={filtros.gerente_id ?? ""}
          onChange={(e) => setFiltros({ ...filtros, gerente_id: paraId(e.target.value) })}
        >
          <option value="">Todos os gerentes</option>
          {gerentes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </SelecaoFiltro>
      </div>

      <AlertaErro mensagem={erro} />

      {!painel && !erro ? (
        <p role="status" className="py-10 text-center text-sm text-cinza">
          Carregando painel…
        </p>
      ) : (
        painel && (
          <>
            <CartoesMetricas kpis={painel.kpis} />
            <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <GraficoFunil funil={painel.funil} />
              <ListaProjetos projetos={painel.projetos} />
            </div>
          </>
        )
      )}

      {/* Usuários e permissões não dependem dos filtros do funil. */}
      <div className="grid items-start gap-6 xl:grid-cols-[1.7fr_1fr]">
        <TabelaUsuarios />
        <MatrizPermissoes />
      </div>
    </div>
  );
}
