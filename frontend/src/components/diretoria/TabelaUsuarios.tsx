"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { IconeMais, IconeSeta } from "@/components/icones";
import { apiDiretoria, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { iniciais } from "@/lib/rotas";
import type { Papel, Usuario, UsuarioPatch } from "@/lib/tipos";
import { CLASSE_CARTAO, PAPEL_CURTO } from "./estilos";
import { ModalConvidarUsuario } from "./ModalConvidarUsuario";

interface TabelaUsuariosProps {
  /** Página /diretoria/usuarios: lista inteira e ativar/desativar conta. No painel, só as primeiras linhas. */
  completa?: boolean;
}

const LIMITE_PAINEL = 5;
const PAPEIS = Object.keys(PAPEL_CURTO) as Papel[];

const STATUS: Record<string, [string, string]> = {
  ativo: ["Ativo", "bg-emerald-50 text-emerald-700"],
  convidado: ["Convite pendente", "bg-amber-50 text-amber-700"],
  inativo: ["Inativo", "bg-slate-100 text-cinza"],
  bloqueado: ["Bloqueado", "bg-perigo-suave text-perigo"],
};

function ChipStatus({ status }: { status: string }) {
  const [rotulo, cor] = STATUS[status] ?? [status, "bg-slate-100 text-cinza"];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${cor}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {rotulo}
    </span>
  );
}

// Mesmo texto da recusa da API (usuarios.atualizar): a própria sessão perderia o acesso à Diretoria.
const MOTIVO_PROPRIO_PERFIL = "Peça a outra conta da Diretoria para mudar o seu perfil.";

export function TabelaUsuarios({ completa = false }: TabelaUsuariosProps) {
  const { sessao } = useAuth();
  const token = sessao!.token;
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<number | null>(null);
  // Erro da API fica na linha que o causou (ex.: "A Diretoria precisa de ao menos uma conta ativa.").
  const [erroLinha, setErroLinha] = useState<{ id: number; mensagem: string } | null>(null);
  const [convidando, setConvidando] = useState(false);
  // O back não envia e-mail: quem convida repassa o link; a conta se completa no cadastro com o mesmo e-mail.
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    apiDiretoria
      .usuarios(token)
      .then((us) => ativo && setUsuarios(us))
      .catch((e: unknown) => ativo && setErro(e instanceof ErroApi ? e.message : "Não foi possível carregar os usuários."));
    return () => {
      ativo = false;
    };
  }, [token]);

  async function atualizar(id: number, dados: UsuarioPatch) {
    setSalvando(id);
    setErroLinha(null);
    try {
      const novo = await apiDiretoria.atualizarUsuario(token, id, dados);
      setUsuarios((us) => us && us.map((u) => (u.id === id ? novo : u)));
    } catch (e: unknown) {
      setErroLinha({ id, mensagem: e instanceof ErroApi ? e.message : "Não foi possível salvar. Tente de novo." });
    } finally {
      setSalvando(null);
    }
  }

  const visiveis = usuarios && (completa ? usuarios : usuarios.slice(0, LIMITE_PAINEL));
  const colunas = completa ? 5 : 4;

  return (
    <section className={`${CLASSE_CARTAO} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 lg:px-8">
        <h2 className="text-xl font-bold text-tinta">Gerenciamento de usuários</h2>
        <button
          type="button"
          onClick={() => setConvidando(true)}
          className="inline-flex h-12 items-center gap-2 rounded-lg border-2 border-slate-300 px-6 font-bold text-tinta transition hover:border-azul hover:text-azul focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/30"
        >
          <IconeMais className="h-4 w-4" />
          Convidar
        </button>
      </div>

      {aviso && (
        <div role="status" className="mx-6 mb-6 flex items-start justify-between gap-3 rounded-lg bg-lima-suave px-4 py-3 text-[15px] text-azul-escuro lg:mx-8">
          <p>{aviso}</p>
          <button type="button" onClick={() => setAviso(null)} className="shrink-0 text-sm font-bold hover:underline">
            Fechar
          </button>
        </div>
      )}
      {erro && (
        <div className="px-6 pb-6 lg:px-8">
          <AlertaErro mensagem={erro} />
        </div>
      )}
      {!usuarios && !erro && <p className="px-6 pb-6 text-sm text-cinza lg:px-8">Carregando usuários…</p>}

      {visiveis && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-[15px]">
            <thead className="bg-fundo text-left text-sm font-semibold text-cinza">
              <tr>
                <th scope="col" className="py-3 pl-6 pr-3 font-semibold lg:pl-8">Nome</th>
                <th scope="col" className="px-3 py-3 font-semibold">E-mail</th>
                <th scope="col" className="px-3 py-3 font-semibold">Perfil</th>
                <th scope="col" className={`py-3 pl-3 font-semibold ${completa ? "pr-3" : "pr-6 lg:pr-8"}`}>Status</th>
                {completa && <th scope="col" className="py-3 pl-3 pr-6 font-semibold lg:pr-8"><span className="sr-only">Ações</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visiveis.map((u) => (
                <Fragment key={u.id}>
                  <tr>
                    <td className="py-3 pl-6 pr-3 lg:pl-8">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-azul-suave text-sm font-bold text-azul-escuro">
                          {iniciais(u.nome)}
                        </span>
                        <span className="font-bold text-tinta">{u.nome}</span>
                      </div>
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-3 text-cinza" title={u.email}>
                      {u.email}
                    </td>
                    <td className="px-3 py-3">
                      <div className="relative w-36">
                        <select
                          aria-label={`Perfil de ${u.nome}`}
                          value={u.papel}
                          disabled={salvando === u.id || u.id === sessao!.usuario.id}
                          title={u.id === sessao!.usuario.id ? MOTIVO_PROPRIO_PERFIL : undefined}
                          onChange={(e) => atualizar(u.id, { papel: e.target.value as Papel })}
                          className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-9 text-[15px] text-tinta outline-none transition focus:border-azul focus:ring-2 focus:ring-azul/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {PAPEIS.map((p) => (
                            <option key={p} value={p}>
                              {PAPEL_CURTO[p]}
                            </option>
                          ))}
                        </select>
                        <IconeSeta className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cinza" />
                      </div>
                    </td>
                    <td className={`py-3 pl-3 ${completa ? "pr-3" : "pr-6 lg:pr-8"}`}>
                      <ChipStatus status={u.status} />
                    </td>
                    {completa && (
                      <td className="py-3 pl-3 pr-6 text-right lg:pr-8">
                        <button
                          type="button"
                          disabled={salvando === u.id}
                          onClick={() => atualizar(u.id, { ativo: u.status === "inativo" })}
                          className="whitespace-nowrap text-sm font-bold text-azul hover:underline disabled:cursor-wait disabled:opacity-60"
                        >
                          {u.status === "inativo" ? "Reativar" : "Desativar"}
                        </button>
                      </td>
                    )}
                  </tr>
                  {erroLinha?.id === u.id && (
                    <tr>
                      <td colSpan={colunas} className="px-6 pb-3 lg:px-8">
                        <AlertaErro mensagem={erroLinha.mensagem} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!completa && usuarios && usuarios.length > LIMITE_PAINEL && (
        <p className="border-t border-slate-200 px-6 py-4 text-right lg:px-8">
          <Link href="/diretoria/usuarios" className="text-[15px] font-bold text-azul hover:underline">
            Ver todos os {usuarios.length} usuários
          </Link>
        </p>
      )}

      {convidando && (
        <ModalConvidarUsuario
          aoFechar={() => setConvidando(false)}
          aoConvidar={(novo) => {
            setUsuarios((us) => (us ? [...us, novo] : [novo]));
            setConvidando(false);
            setAviso(
              `Convite criado. O sistema não envia e-mail: mande a ${novo.nome} o link ${window.location.origin}/cadastro. ` +
                `Ao se cadastrar com ${novo.email}, a pessoa define a senha e entra como ${novo.perfil}.`,
            );
          }}
        />
      )}
    </section>
  );
}
