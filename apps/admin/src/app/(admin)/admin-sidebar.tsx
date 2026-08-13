"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Avatar, AvatarFallback } from "@empresa/ui/components/avatar";
import { Badge } from "@empresa/ui/components/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@empresa/ui/components/sheet";
import { cn } from "@empresa/ui/utils";
import {
  LayoutDashboard,
  FileClock,
  Settings,
  CreditCard,
  LogOut,
  Menu,
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

/**
 * Navegação do painel super_admin. Hoje só "Visão geral" é uma rota real —
 * os demais itens ficam desabilitados como placeholder visual, deixando a
 * estrutura pronta para quando essas seções existirem (logs de auditoria,
 * configurações globais do produto, assinaturas das empresas). Ver
 * `apps/web-estetica/src/components/app-sidebar.tsx` para o padrão espelhado
 * aqui: mesmo shell (`--sidebar` tokens), mesma estrutura de brand/nav/footer.
 */
const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
}[] = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/auditoria", label: "Auditoria", icon: FileClock, disabled: true },
  {
    href: "/configuracoes",
    label: "Configurações globais",
    icon: Settings,
    disabled: true,
  },
  { href: "/assinaturas", label: "Assinaturas", icon: CreditCard, disabled: true },
];

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

function SidebarBrand() {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
      <BrandIcon className="size-8 shrink-0" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold leading-tight">
          CLICLI Sistema
        </span>
        <span className="truncate text-xs text-sidebar-foreground/60">
          Painel do sistema
        </span>
      </div>
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
        const Icon = item.icon;

        if (item.disabled) {
          return (
            <div
              key={item.href}
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/35"
            >
              <Icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              <Badge
                variant="outline"
                className="border-sidebar-border text-[10px] text-sidebar-foreground/50"
              >
                Em breve
              </Badge>
            </div>
          );
        }

        const active = pathname === item.href;
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
  onLogout,
}: {
  usuarioNome: string;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-sidebar-border p-3">
      <Avatar className="ring-2 ring-sidebar-border">
        <AvatarFallback>{iniciais(usuarioNome)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{usuarioNome}</span>
        <span className="truncate text-xs text-sidebar-foreground/60">
          Super admin
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onLogout}
        aria-label="Sair"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}

export function AdminSidebar({ usuarioNome }: { usuarioNome: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden h-svh w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <SidebarBrand />
        <SidebarNav items={NAV_ITEMS} pathname={pathname} />
        <SidebarFooter usuarioNome={usuarioNome} onLogout={handleLogout} />
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b bg-sidebar px-4 text-sidebar-foreground md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon-sm" />}>
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
            <SidebarBrand />
            <SidebarNav
              items={NAV_ITEMS}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
            <SidebarFooter usuarioNome={usuarioNome} onLogout={handleLogout} />
          </SheetContent>
        </Sheet>
        <BrandIcon className="size-7 shrink-0" />
        <span className="truncate text-sm font-semibold">CLICLI Sistema</span>
      </header>
    </>
  );
}
