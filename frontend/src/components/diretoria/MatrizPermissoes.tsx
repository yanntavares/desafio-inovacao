"use client";

import { useEffect, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { IconeCadeado, IconeCheckCirculo } from "@/components/icones";
import { apiDiretoria, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import type { MatrizPermissoes as Matriz, Papel } from "@/lib/tipos";
import { CLASSE_CARTAO } from "./estilos";

const CABECALHO: Partial<Record<Papel, string>> = { comercial: "Analista", gerente: "Gerente", admin: "Dir." };

/** Somente leitura: a matriz vem de `permissoes.MATRIZ` no back, a mesma que os gates usam. */
export function MatrizPermissoes() {
  const { sessao } = useAuth();
  const [matriz, setMatriz] = useState<Matriz | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    apiDiretoria
      .permissoes(sessao!.token)
      .then((m) => ativo && setMatriz(m))
      .catch((e: unknown) => ativo && setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar as permissões."));
    return () => {
      ativo = false;
    };
  }, [sessao]);

  return (
    <section className={`${CLASSE_CARTAO} p-6 lg:p-8`}>
      <h2 className="text-xl font-bold text-tinta">Permissões por perfil</h2>
      {erro && (
        <div className="mt-4">
          <AlertaErro mensagem={erro} />
        </div>
      )}
      {!matriz && !erro && <p className="mt-6 text-sm text-cinza">Carregando…</p>}
      {matriz && (
        <>
          <table className="mt-4 w-full text-[15px]">
            <thead>
              <tr className="text-sm font-semibold text-cinza">
                <th scope="col" className="py-2 text-left font-semibold">
                  <span className="sr-only">Ação</span>
                </th>
                {matriz.perfis.map((p) => (
                  <th key={p.papel} scope="col" title={p.perfil} className="w-16 py-2 text-center font-semibold sm:w-20">
                    {CABECALHO[p.papel] ?? p.perfil}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {matriz.linhas.map((l) => (
                <tr key={l.acao}>
                  <th scope="row" className="py-3 text-left font-normal text-tinta">
                    {l.acao}
                  </th>
                  {matriz.perfis.map((p) => (
                    <td key={p.papel} className="py-3 text-center">
                      {l.permitido[p.papel] ? (
                        <IconeCheckCirculo corFundo="#047857" corCheck="#fff" className="mx-auto h-6 w-6" />
                      ) : (
                        <span className="text-slate-300" aria-label="Não permitido">
                          —
                        </span>
                      )}
                      {l.permitido[p.papel] && <span className="sr-only">Permitido</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-lima-suave px-4 py-3 text-sm font-bold text-azul-escuro">
            <IconeCadeado className="h-4 w-4 shrink-0" />
            {matriz.aviso}
          </p>
        </>
      )}
    </section>
  );
}
