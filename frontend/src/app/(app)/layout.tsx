"use client";

import { Carregando } from "@/components/layout/Carregando";
import { HeaderBreadcrumb } from "@/components/layout/HeaderBreadcrumb";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { useState } from "react";
import { useExigirSessao } from "@/lib/auth/guardas";
import { MigalhaContext } from "@/lib/migalha";

export default function LayoutAutenticado({ children }: { children: React.ReactNode }) {
  const liberado = useExigirSessao();
  const [migalha, setMigalha] = useState<string | null>(null);
  if (!liberado) return <Carregando />;

  return (
    <div className="flex min-h-screen flex-col bg-fundo lg:flex-row">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBreadcrumb titulo={migalha} />
        <main className="flex-1 px-6 py-8 lg:px-8 xl:px-10">
          <MigalhaContext value={setMigalha}>{children}</MigalhaContext>
        </main>
      </div>
    </div>
  );
}
