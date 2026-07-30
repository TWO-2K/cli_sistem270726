"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { LogOut, ShieldCheck } from "lucide-react";

export function AdminHeader({ usuarioNome }: { usuarioNome: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold leading-none">
            Painel do sistema
          </p>
          <p className="text-xs text-muted-foreground">{usuarioNome}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </header>
  );
}
