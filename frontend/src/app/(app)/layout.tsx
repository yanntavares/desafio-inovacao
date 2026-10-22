"use client";

import { Carregando } from "@/components/layout/Carregando";
import { HeaderBreadcrumb } from "@/components/layout/HeaderBreadcrumb";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { useExigirSessao } from "@/lib/auth/guardas";

export default function LayoutAutenticado({ children }: { children: React.ReactNode }) {
  const liberado = useExigirSessao();
  if (!liberado) return <Carregando />;

  return (
    <div className="flex min-h-screen flex-col bg-fundo lg:flex-row">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderBreadcrumb />
        <main className="flex-1 px-6 py-8 lg:px-12">{children}</main>
      </div>
    </div>
  );
}
