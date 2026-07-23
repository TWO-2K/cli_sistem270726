import { requireUsuarioClinica } from "@/lib/current-clinica";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, clinica } = await requireUsuarioClinica();

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar
        clinicaNome={clinica.nome}
        usuarioNome={usuario.nome}
        perfil={usuario.perfil}
      />
      <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
        {children}
      </main>
    </div>
  );
}
