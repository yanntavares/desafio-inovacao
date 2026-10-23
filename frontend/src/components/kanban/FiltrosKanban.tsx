import { paraId, SelecaoFiltro as Selecao } from "@/components/formulario/SelecaoFiltro";
import type { FiltrosKanban as Filtros, LeadOpcao, UsuarioOpcao } from "@/lib/tipos";

interface FiltrosKanbanProps {
  filtros: Filtros;
  aoMudar: (filtros: Filtros) => void;
  /** null = visão do analista: sem filtro por analista (a API já restringe aos leads dele). */
  analistas: UsuarioOpcao[] | null;
  negocios: LeadOpcao[];
}

export function FiltrosKanban({ filtros, aoMudar, analistas, negocios }: FiltrosKanbanProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-3">
        {analistas ? (
          <Selecao
            rotulo="Filtrar por analista"
            value={filtros.analista_id ?? ""}
            onChange={(e) => aoMudar({ ...filtros, analista_id: paraId(e.target.value) })}
          >
            <option value="">Todos os analistas</option>
            {analistas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Selecao>
        ) : (
          <Selecao rotulo="Carteira" disabled title="Analistas veem apenas os próprios leads." value="">
            <option value="">Meus leads</option>
          </Selecao>
        )}
        <Selecao
          rotulo="Filtrar por negócio"
          value={filtros.negocio_id ?? ""}
          onChange={(e) => aoMudar({ ...filtros, negocio_id: paraId(e.target.value) })}
        >
          <option value="">Todos os negócios</option>
          {negocios.map((n) => (
            <option key={n.id} value={n.id}>
              {n.cliente} · {n.titulo}
            </option>
          ))}
        </Selecao>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-[15px] font-semibold text-tinta">
        <input
          type="checkbox"
          checked={filtros.so_bloqueantes}
          onChange={(e) => aoMudar({ ...filtros, so_bloqueantes: e.target.checked })}
          className="h-5 w-5 cursor-pointer rounded border-slate-300 accent-azul"
        />
        Só com pendência bloqueante
      </label>
    </div>
  );
}
