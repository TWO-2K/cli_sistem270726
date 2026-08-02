"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Avatar, AvatarFallback } from "@empresa/ui/components/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@empresa/ui/components/sheet";
import { cn } from "@empresa/ui/utils";
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
  Menu,
  Kanban,
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
    href: "/leads",
    label: "Funil de leads",
    icon: Kanban,
    perfis: ["admin", "recepcao", "financeiro"],
  },
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

const PERFIL_LABELS: Record<Perfil, string> = {
  super_admin: "Super admin",
  admin: "Administrador",
  recepcao: "Recepção",
  profissional: "Profissional",
  financeiro: "Financeiro",
};

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

function SidebarBrand({ empresaNome }: { empresaNome: string }) {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Stethoscope className="size-4" />
      </div>
      <span className="truncate text-base font-semibold">{empresaNome}</span>
    </div>
  );
}

function SidebarNav({
  items,
  pathname,
  onNavigate,
}: {
  items: typeof NAV_ITEMS;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({
  usuarioNome,
  perfil,
  onLogout,
}: {
  usuarioNome: string;
  perfil: Perfil;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-sidebar-border p-3">
      <Avatar className="ring-2 ring-sidebar-border">
        <AvatarFallback>{iniciais(usuarioNome)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{usuarioNome}</span>
        <span className="truncate text-xs text-muted-foreground">
          {PERFIL_LABELS[perfil]}
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={onLogout}>
        <LogOut className="size-4" />
        Sair
      </Button>
    </div>
  );
}

export function AppSidebar({
  empresaNome,
  usuarioNome,
  perfil,
}: {
  empresaNome: string;
  usuarioNome: string;
  perfil: Perfil;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

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
    <>
      <aside className="fixed inset-y-0 left-0 hidden h-svh w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <SidebarBrand empresaNome={empresaNome} />
        <SidebarNav items={items} pathname={pathname} />
        <SidebarFooter
          usuarioNome={usuarioNome}
          perfil={perfil}
          onLogout={handleLogout}
        />
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b bg-sidebar px-4 text-sidebar-foreground md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <Menu className="size-4" />
            <span className="sr-only">Abrir menu</span>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-64 flex-col gap-0 p-0 sm:max-w-64"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <SidebarBrand empresaNome={empresaNome} />
            <SidebarNav
              items={items}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
            <SidebarFooter
              usuarioNome={usuarioNome}
              perfil={perfil}
              onLogout={handleLogout}
            />
          </SheetContent>
        </Sheet>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Stethoscope className="size-3.5" />
        </div>
        <span className="truncate text-sm font-semibold">{empresaNome}</span>
      </header>
    </>
  );
}
