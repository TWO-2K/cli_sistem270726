"use client";

import { useEffect, useState } from "react";
import { cn } from "@empresa/ui/utils";
import type { Perfil } from "@/lib/types/db";
import { AppSidebar } from "./app-sidebar";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

export function AppShell({
  empresaNome,
  usuarioNome,
  perfil,
  children,
}: {
  empresaNome: string;
  usuarioNome: string;
  perfil: Perfil;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Lido do localStorage após montar (evita mismatch de hydration com o SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((atual) => {
      const proximo = !atual;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, proximo ? "1" : "0");
      return proximo;
    });
  }

  return (
    <div className="h-svh overflow-x-clip">
      <AppSidebar
        empresaNome={empresaNome}
        usuarioNome={usuarioNome}
        perfil={perfil}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <main
        className={cn(
          "flex h-svh flex-col overflow-x-clip overflow-y-auto bg-muted/20 p-4 pt-18 md:py-6 md:pr-6",
          collapsed
            ? "md:pl-[calc(var(--spacing)*18+1.5rem)]"
            : "md:pl-[calc(var(--spacing)*64+1.5rem)]",
        )}
      >
        <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-7xl flex-1 flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
