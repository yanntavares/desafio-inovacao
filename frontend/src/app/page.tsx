"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { rotaInicial } from "@/lib/rotas";
import { Carregando } from "@/components/layout/Carregando";

export default function Inicio() {
  const { pronto, sessao } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!pronto) return;
    router.replace(sessao ? rotaInicial(sessao.usuario.papel) : "/login");
  }, [pronto, sessao, router]);

  return <Carregando />;
}
