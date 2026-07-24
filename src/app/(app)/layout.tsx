import { requireUsuarioClinica } from "@/lib/current-clinica";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, clinica } = await requireUsuarioClinica();

  return (
    <div className="h-svh">
      <AppSidebar
        clinicaNome={clinica.nome}
        usuarioNome={usuario.nome}
        perfil={usuario.perfil}
      />
      <main className="flex h-svh flex-col overflow-hidden bg-muted/20 p-4 pt-18 md:py-6 md:pr-6 md:pl-[calc(var(--spacing)*64+1.5rem)]">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
