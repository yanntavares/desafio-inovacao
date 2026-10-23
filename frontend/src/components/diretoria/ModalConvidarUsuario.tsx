"use client";

import { useEffect, useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { CampoSelecao } from "@/components/formulario/CampoSelecao";
import { CampoTexto } from "@/components/formulario/CampoTexto";
import { IconeFechar } from "@/components/icones";
import { apiDiretoria, DOMINIO_EMAIL, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { ROTULO_PAPEL } from "@/lib/rotas";
import type { Papel, Usuario } from "@/lib/tipos";

interface ModalConvidarUsuarioProps {
  aoFechar: () => void;
  aoConvidar: (usuario: Usuario) => void;
}

const PAPEIS: Papel[] = ["comercial", "gerente", "tecnico", "admin"];

export function ModalConvidarUsuario({ aoFechar, aoConvidar }: ModalConvidarUsuarioProps) {
  const { sessao } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Papel>("comercial");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const motivoBloqueio = !nome.trim()
    ? "Informe o nome da pessoa."
    : !email.trim()
      ? "Informe o e-mail institucional."
      : null;

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && !enviando && aoFechar();
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar, enviando]);

  async function convidar(e: React.FormEvent) {
    e.preventDefault();
    if (motivoBloqueio) return;
    setEnviando(true);
    setErro(null);
    try {
      aoConvidar(await apiDiretoria.convidar(sessao!.token, { nome: nome.trim(), email: email.trim(), papel }));
    } catch (e: unknown) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível enviar o convite. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-marinho/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !enviando && aoFechar()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-convite"
        onSubmit={convidar}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl lg:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cinza">Gerenciamento de usuários</p>
            <h2 id="titulo-convite" className="mt-1 text-2xl font-bold text-azul-escuro">
              Convidar pessoa
            </h2>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            disabled={enviando}
            aria-label="Fechar"
            className="rounded-lg p-1 text-cinza hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40"
          >
            <IconeFechar className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <CampoTexto
            tom="sobreBranco"
            rotulo="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            autoComplete="off"
          />
          <CampoTexto
            tom="sobreBranco"
            rotulo="E-mail institucional"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`nome.sobrenome@${DOMINIO_EMAIL}`}
            autoComplete="off"
          />
          <CampoSelecao
            rotulo="Perfil"
            value={papel}
            onChange={(e) => setPapel(e.target.value as Papel)}
            ajuda="A conta fica como convite pendente até a pessoa definir a senha."
          >
            {PAPEIS.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PAPEL[p]}
              </option>
            ))}
          </CampoSelecao>
        </div>

        <div className="mt-5">
          <AlertaErro mensagem={erro} />
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={aoFechar}
            disabled={enviando}
            className="h-12 rounded-lg border-2 border-azul-escuro px-6 font-bold text-azul-escuro transition hover:bg-azul-suave disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!!motivoBloqueio || enviando}
            title={motivoBloqueio ?? undefined}
            className="h-12 rounded-lg bg-azul px-6 font-bold text-white transition hover:bg-[#04549a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Convidando…" : "Convidar"}
          </button>
        </div>
        {motivoBloqueio && <p className="mt-2 text-right text-xs text-cinza">{motivoBloqueio}</p>}
      </form>
    </div>
  );
}
