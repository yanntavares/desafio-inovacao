"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartaoPerfilDemo } from "@/components/auth/CartaoPerfilDemo";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { BotaoPrimario } from "@/components/formulario/BotaoPrimario";
import { CampoTexto } from "@/components/formulario/CampoTexto";
import { IconeCheckCirculo } from "@/components/icones";
import { Logo } from "@/components/marca/Logo";
import { apiAuth, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRedirecionarSeLogado } from "@/lib/auth/guardas";
import type { PerfilDemo } from "@/lib/tipos";

// Faixas discretas do painel da marca (tela 02), sem recorte nas bordas.
const FAIXAS =
  "repeating-linear-gradient(-35deg, transparent 0 70px, rgba(5,99,180,.18) 70px 82px, transparent 82px 150px, rgba(219,234,53,.10) 150px 160px)";

const BENEFICIOS = [
  "Dados estruturados e verificáveis",
  "Passagem de bastão sem perda de contexto",
  "Aprovação humana em cada gate",
];

// "indisponivel": DEMO_MODE desligado na API (GET /auth/demo → 404); a seção some.
type EstadoDemo = { tipo: "carregando" } | { tipo: "pronto"; perfis: PerfilDemo[] } | { tipo: "indisponivel" };

export default function LoginPage() {
  useRedirecionarSeLogado();
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [demo, setDemo] = useState<EstadoDemo>({ tipo: "carregando" });
  const [perfilEntrando, setPerfilEntrando] = useState<PerfilDemo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    apiAuth
      .perfisDemo()
      .then((perfis) => ativo && setDemo(perfis.length ? { tipo: "pronto", perfis } : { tipo: "indisponivel" }))
      .catch(() => ativo && setDemo({ tipo: "indisponivel" }));
    return () => {
      ativo = false;
    };
  }, []);

  async function entrarComoPerfil(perfil: PerfilDemo) {
    setErro(null);
    setPerfilEntrando(perfil);
    setEnviando(true);
    try {
      entrar(await apiAuth.entrarDemo(perfil.papel), true);
      // o redirecionamento vem de useRedirecionarSeLogado
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível entrar. Tente de novo.");
      setPerfilEntrando(null);
      setEnviando(false);
    }
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha para entrar.");
      return;
    }
    setEnviando(true);
    try {
      entrar(await apiAuth.entrar({ email: email.trim(), senha }));
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível entrar. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-marinho lg:grid-cols-[37%_1fr]">
      {/* Painel da marca */}
      <section
        className="relative flex flex-col overflow-hidden px-8 py-10 text-white lg:px-[12%] lg:py-14"
        style={{ backgroundImage: FAIXAS }}
      >
        <Logo variante="verde" prioridade className="relative h-12 w-auto self-start lg:h-14" />

        <div className="relative mt-12 lg:my-auto">
          <span className="block h-1.5 w-20 rounded-full bg-lima" />
          <h1 className="mt-8 text-4xl font-extrabold leading-tight lg:text-[2.6rem]">
            A informação acompanha o cliente até o projeto.
          </h1>
          <p className="mt-6 text-lg text-white/70">Da primeira reunião ao kickoff, sem reconstruir o contexto a cada etapa.</p>
          <ul className="mt-12 hidden space-y-5 lg:block">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-center gap-4 text-lg">
                <IconeCheckCirculo corFundo="#dbea35" corCheck="#0b1f3f" className="h-6 w-6 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-10 hidden text-sm text-white/50 lg:block">
          Batalha de Inovação Conecta V360 2026 · Trilha B
        </p>
      </section>

      {/* Formulário */}
      <section className="flex lg:pr-[8.5%]">
        <div className="flex flex-1 justify-center bg-lima px-6 pb-14 pt-12 sm:px-12 lg:px-[11%] lg:pt-20">
          <div className="w-full max-w-3xl">
            <header className="border-l-4 border-azul-escuro pl-4">
              <h2 className="text-4xl font-extrabold text-azul-escuro">Entrar</h2>
              <p className="mt-2 text-lg text-cinza">Use o e-mail institucional da Seed a Bit.</p>
            </header>

            <form noValidate onSubmit={enviar} className="mt-10">
              <div className="space-y-6">
                <CampoTexto
                  tom="sobreLima"
                  rotulo="E-mail"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <CampoTexto
                  tom="sobreLima"
                  rotulo="Senha"
                  type="password"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <div className="mt-3 text-right">
                <button
                  type="button"
                  disabled
                  title="Recuperação de senha fora do MVP. Fale com a Diretoria para redefinir."
                  className="cursor-not-allowed text-sm font-bold text-azul/70"
                >
                  Esqueci a senha
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <AlertaErro mensagem={erro} />
                <BotaoPrimario type="submit" carregando={enviando && !perfilEntrando} disabled={enviando} textoCarregando="Entrando…">
                  Entrar
                </BotaoPrimario>
              </div>
            </form>

            <p className="mt-10 text-center font-bold text-azul">
              <Link href="/cadastro" className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-azul">
                Não tem conta? Criar conta
              </Link>
            </p>

            {demo.tipo !== "indisponivel" && (
              <section aria-labelledby="titulo-demo" className="mt-10">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inset-x-0 h-px bg-slate-400/40" />
                  <span id="titulo-demo" className="relative bg-white/90 px-12 py-1 text-sm font-bold text-cinza">
                    Modo demonstração
                  </span>
                </div>
                <p className="mt-8 text-sm font-bold text-tinta/80">Entrar com dados fictícios como:</p>

                <div role="group" aria-labelledby="titulo-demo" className="mt-4 space-y-3">
                  {demo.tipo === "carregando"
                    ? [0, 1, 2].map((i) => <div key={i} className="h-[84px] animate-pulse rounded-xl bg-white/60" />)
                    : demo.perfis.map((p) => (
                        <CartaoPerfilDemo
                          key={p.papel}
                          perfil={p}
                          entrando={perfilEntrando?.papel === p.papel}
                          desabilitado={enviando}
                          onEntrar={() => entrarComoPerfil(p)}
                        />
                      ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
