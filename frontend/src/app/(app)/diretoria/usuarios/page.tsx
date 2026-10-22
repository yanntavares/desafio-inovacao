import { MatrizPermissoes } from "@/components/diretoria/MatrizPermissoes";
import { TabelaUsuarios } from "@/components/diretoria/TabelaUsuarios";

export default function UsuariosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-azul-escuro lg:text-4xl">Usuários</h1>
        <p className="mt-2 text-[17px] text-cinza">
          Convide pessoas, ajuste perfis e desative contas. Conta nova entra como analista.
        </p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[1.7fr_1fr]">
        <TabelaUsuarios completa />
        <MatrizPermissoes />
      </div>
    </div>
  );
}
