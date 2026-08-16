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
  Receipt,
  ListTodo,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function BrandIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo/logo-symbol-square.png"
      alt=""
      className={cn("object-contain", className)}
    />
  );
}

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  perfis?: Perfil[];
}[] = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/atendimento", label: "Atendimento", icon: Stethoscope },
  {
    href: "/lista-espera",
    label: "Lista de espera",
    icon: ListTodo,
    perfis: ["admin", "recepcao"],
  },
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
  {
    href: "/minhas-comissoes",
    label: "Minhas comissões",
    icon: Receipt,
    perfis: ["profissional"],
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    icon: BarChart3,
    perfis: ["admin", "financeiro"],
  },
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

function SidebarBrand({
  empresaNome,
  collapsed,
}: {
  empresaNome: string;
  collapsed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-16 items-center gap-3 border-b border-sidebar-border px-4",
        collapsed && "justify-center px-2",
      )}
    >
      <BrandIcon className="size-8 shrink-0" />
      {!collapsed && (
        <span className="truncate text-base font-semibold">
          {empresaNome}
        </span>
      )}
    </div>
  );
}

function SidebarNav({
  items,
  pathname,
  onNavigate,
  collapsed,
}: {
  items: typeof NAV_ITEMS;
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
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
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              collapsed && "justify-center px-2",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && item.label}
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
  collapsed,
}: {
  usuarioNome: string;
  perfil: Perfil;
  onLogout: () => void;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-sidebar-border p-3">
        <Avatar
          className="ring-2 ring-sidebar-border"
          title={`${usuarioNome} · ${PERFIL_LABELS[perfil]}`}
        >
          <AvatarFallback>{iniciais(usuarioNome)}</AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onLogout}
          title="Sair"
        >
          <LogOut className="size-4" />
          <span className="sr-only">Sair</span>
        </Button>
      </div>
    );
  }

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
  collapsed = false,
  onToggleCollapsed,
}: {
  empresaNome: string;
  usuarioNome: string;
  perfil: Perfil;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
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
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden h-svh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-18" : "w-64",
        )}
      >
        <SidebarBrand empresaNome={empresaNome} collapsed={collapsed} />
        <SidebarNav items={items} pathname={pathname} collapsed={collapsed} />
        <SidebarFooter
          usuarioNome={usuarioNome}
          perfil={perfil}
          onLogout={handleLogout}
          collapsed={collapsed}
        />
        {onToggleCollapsed && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className="absolute top-14 -right-3.5 size-7 rounded-full border-sidebar-border bg-sidebar shadow-sm"
          >
            {collapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronLeft className="size-3.5" />
            )}
            <span className="sr-only">
              {collapsed ? "Expandir menu" : "Recolher menu"}
            </span>
          </Button>
        )}
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
        <BrandIcon className="size-7 shrink-0" />
        <span className="truncate text-sm font-semibold">{empresaNome}</span>
      </header>
    </>
  );
}
