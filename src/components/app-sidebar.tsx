"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Perfil } from "@/lib/types/db";
import {
  CalendarDays,
  Users,
  Stethoscope,
  Wallet,
  BarChart3,
  Settings,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  perfis?: Perfil[];
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/atendimento", label: "Atendimento", icon: Stethoscope },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: Wallet,
    perfis: ["admin", "financeiro"],
  },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
    perfis: ["admin"],
  },
];

export function AppSidebar({
  clinicaNome,
  usuarioNome,
  perfil,
}: {
  clinicaNome: string;
  usuarioNome: string;
  perfil: Perfil;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const items = NAV_ITEMS.filter(
    (item) => !item.perfis || item.perfis.includes(perfil),
  );

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col gap-0.5 border-b px-4 py-4">
        <span className="truncate text-sm font-semibold">{clinicaNome}</span>
        <span className="truncate text-xs text-muted-foreground">
          {usuarioNome}
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
