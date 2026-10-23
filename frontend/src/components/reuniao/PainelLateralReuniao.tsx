import { IconeCadeado } from "@/components/icones";

const PASSOS = [
  { titulo: "O sistema mascara dados pessoais", detalhe: "E-mail, telefone, CPF e CNPJ" },
  { titulo: "A IA extrai a ficha", detalhe: "Em segundo plano, com trechos-evidência" },
  { titulo: "Você valida a ficha (G2)", detalhe: "Confirma, edita ou rejeita cada item" },
];

export function OQueAconteceDepois() {
  return (
    <section
      aria-labelledby="titulo-depois"
      className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_4px_10px_rgba(15,27,45,0.08)]"
    >
      <h2 id="titulo-depois" className="text-xl font-bold text-azul-escuro">
        O que acontece depois
      </h2>
      <ol className="mt-6 space-y-7">
        {PASSOS.map((passo, i) => (
          <li key={passo.titulo} className="flex gap-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lima text-sm font-bold text-azul-escuro">
              {i + 1}
            </span>
            <div>
              <p className="font-bold text-azul-escuro">{passo.titulo}</p>
              <p className="mt-0.5 text-sm text-cinza">{passo.detalhe}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AvisoPrivacidade() {
  return (
    <aside className="rounded-xl border-l-4 border-[#a8b820] bg-lima-suave px-7 py-6">
      <p className="flex items-center gap-2.5 font-bold text-azul-escuro">
        <IconeCadeado className="h-5 w-5" /> Privacidade
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-azul-escuro/90">
        A IA só recebe o texto mascarado. Use dados fictícios ou com autorização documentada.
      </p>
    </aside>
  );
}
