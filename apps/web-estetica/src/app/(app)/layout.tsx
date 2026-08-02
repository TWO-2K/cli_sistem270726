import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, empresa } = await requireUsuarioEmpresa();

  return (
    <div className="h-svh overflow-x-clip">
      <AppSidebar
        empresaNome={empresa.nome}
        usuarioNome={usuario.nome}
        perfil={usuario.perfil}
      />
      <main className="flex h-svh flex-col overflow-hidden bg-muted/20 p-4 pt-18 md:py-6 md:pr-6 md:pl-[calc(var(--spacing)*64+1.5rem)]">
        <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-7xl flex-1 flex-col overflow-x-clip overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
