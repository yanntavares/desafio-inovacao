"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertaErro } from "@/components/formulario/AlertaErro";
import { BotaoPrimario } from "@/components/formulario/BotaoPrimario";
import { CampoTexto } from "@/components/formulario/CampoTexto";
import { IconeCheck, IconeCheckCirculo } from "@/components/icones";
import { SetasDecorativas } from "@/components/marca/Decoracoes";
import { Logo } from "@/components/marca/Logo";
import { clipRecortado } from "@/components/marca/recorte";
import { apiAuth, DOMINIO_EMAIL, ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRedirecionarSeLogado } from "@/lib/auth/guardas";

const SENHA_MINIMO = 10;
const CLIP_PAINEL = clipRecortado({ esquerda: true, direita: true, baixo: true }, 5, 11);

interface Campos {
  nome: string;
  email: string;
  senha: string;
  confirmar: string;
  aceite: boolean;
}

type Erros = Partial<Record<keyof Campos, string>>;

// Espelha usuarios.cadastrar_conta para avisar antes do envio; a API continua sendo a regra.
function validar(c: Campos): Erros {
  const erros: Erros = {};
  if (!c.nome.trim()) erros.nome = "Informe o nome completo.";
  if (!c.email.trim().toLowerCase().endsWith(`@${DOMINIO_EMAIL}`))
    erros.email = `Use o e-mail institucional (@${DOMINIO_EMAIL}).`;
  if (c.senha.length < SENHA_MINIMO || !/[A-Za-z]/.test(c.senha) || !/\d/.test(c.senha))
    erros.senha = `A senha precisa ter no mínimo ${SENHA_MINIMO} caracteres, com letras e números.`;
  if (c.confirmar !== c.senha) erros.confirmar = "As senhas não conferem.";
  if (!c.aceite) erros.aceite = "É preciso concordar com o tratamento de dados (LGPD) para criar a conta.";
  return erros;
}

export default function CadastroPage() {
  useRedirecionarSeLogado();
  const { entrar } = useAuth();
  const [campos, setCampos] = useState<Campos>({ nome: "", email: "", senha: "", confirmar: "", aceite: false });
  const [erros, setErros] = useState<Erros>({});
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function alterar<K extends keyof Campos>(campo: K, valor: Campos[K]) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroApi(null);
    const encontrados = validar(campos);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    try {
      const resposta = await apiAuth.cadastrar({
        nome: campos.nome.trim(),
        email: campos.email.trim(),
        senha: campos.senha,
        confirmar_senha: campos.confirmar,
        aceite_lgpd: campos.aceite,
      });
      entrar(resposta); // o redirecionamento vem de useRedirecionarSeLogado
    } catch (erro) {
      setErroApi(erro instanceof ErroApi ? erro.message : "Não foi possível criar a conta. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-marinho text-white">
      <SetasDecorativas
        direcao="esquerda"
        quantidade={4}
        className="absolute right-[4%] top-12 hidden w-[52%] text-lima lg:flex"
      />
      <SetasDecorativas
        direcao="direita"
        quantidade={6}
        corPrimeira="#ffffff"
        className="absolute bottom-10 left-[2%] right-[3%] hidden text-lima lg:flex"
      />

      <div className="relative z-10 grid flex-1 gap-10 lg:grid-cols-[minmax(0,37%)_1fr] lg:gap-16 lg:pl-[5%] lg:pr-[4%]">
        {/* Painel da marca */}
        <section
          className="flex flex-col bg-lima px-8 pb-10 pt-12 text-azul-escuro lg:h-[77vh] lg:min-h-[640px] lg:px-14 lg:pt-16"
          style={{ clipPath: CLIP_PAINEL }}
        >
          <Logo variante="azul" prioridade className="h-12 w-auto self-start lg:h-14" />

          <div className="mt-12 lg:mt-auto lg:mb-auto">
            <span className="block h-1.5 w-20 rounded-full bg-azul-escuro" />
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight lg:text-[2.75rem]">
              <span className="text-azul">Comece a registrar</span>
              <br />
              <span className="text-white [text-shadow:0_2px_6px_rgba(11,31,63,0.35)]">a jornada do cliente.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-snug text-azul-escuro">
              Crie sua conta para acompanhar leads, reuniões e passagens de bastão em um só lugar.
            </p>

            <ol aria-hidden className="relative mt-10 flex max-w-md items-center justify-between">
              <span className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 bg-white" />
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="relative">
                  <IconeCheckCirculo corFundo="#0b2f6b" corCheck="#ffffff" className="h-6 w-6" />
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-10 text-sm text-azul-escuro/90">Batalha de Inovação Conecta V360 2026 · Trilha B</p>
        </section>

        {/* Formulário */}
        <section className="flex items-start px-6 pb-16 lg:items-center lg:px-0 lg:pb-24 lg:pt-12">
          <div className="w-full max-w-3xl">
            <header className="border-l-4 border-lima pl-5">
              <h2 className="text-4xl font-extrabold text-lima">Criar conta</h2>
              <p className="mt-1 text-lg text-white">Cadastro de analistas e gerentes da Seed a Bit.</p>
            </header>

            <form noValidate onSubmit={enviar} className="mt-10 space-y-7">
              <CampoTexto
                tom="sobreMarinho"
                rotulo="Nome completo"
                autoComplete="name"
                value={campos.nome}
                onChange={(e) => alterar("nome", e.target.value)}
                erro={erros.nome}
              />
              <CampoTexto
                tom="sobreMarinho"
                rotulo="E-mail institucional"
                type="email"
                autoComplete="email"
                placeholder={`nome.sobrenome@${DOMINIO_EMAIL}`}
                value={campos.email}
                onChange={(e) => alterar("email", e.target.value)}
                erro={erros.email}
              />

              <div>
                <div className="grid gap-7 sm:grid-cols-2 sm:gap-6">
                  <CampoTexto
                    tom="sobreMarinho"
                    rotulo="Senha"
                    type="password"
                    autoComplete="new-password"
                    value={campos.senha}
                    onChange={(e) => alterar("senha", e.target.value)}
                    erro={erros.senha}
                  />
                  <CampoTexto
                    tom="sobreMarinho"
                    rotulo="Confirmar senha"
                    type="password"
                    autoComplete="new-password"
                    value={campos.confirmar}
                    onChange={(e) => alterar("confirmar", e.target.value)}
                    erro={erros.confirmar}
                  />
                </div>
                {!erros.senha && (
                  <p className="mt-2 text-sm text-white/60">
                    Mínimo de {SENHA_MINIMO} caracteres, com letras e números.
                  </p>
                )}
              </div>

              <div>
                <label className="flex cursor-pointer items-center gap-4 pl-2 text-[17px]">
                  <span className="relative grid h-6 w-6 shrink-0 place-items-center">
                    <input
                      type="checkbox"
                      checked={campos.aceite}
                      onChange={(e) => alterar("aceite", e.target.checked)}
                      aria-invalid={erros.aceite ? true : undefined}
                      className="peer absolute inset-0 cursor-pointer appearance-none rounded-md border-2 border-white/70 bg-transparent transition checked:border-azul checked:bg-azul focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lima"
                    />
                    <IconeCheck className="pointer-events-none relative h-4 w-4 text-white opacity-0 peer-checked:opacity-100" />
                  </span>
                  Concordo com o tratamento dos meus dados conforme a LGPD.
                </label>
                {erros.aceite && (
                  <p role="alert" className="mt-2 pl-2 text-xs font-medium text-red-300">
                    {erros.aceite}
                  </p>
                )}
              </div>

              <AlertaErro mensagem={erroApi} />

              <BotaoPrimario type="submit" carregando={enviando} textoCarregando="Criando conta…">
                Criar conta
              </BotaoPrimario>
            </form>

            <p className="mt-8 text-center font-bold">
              <Link href="/login" className="rounded hover:text-lima focus-visible:outline-2 focus-visible:outline-lima">
                Já tem conta? Entrar
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
