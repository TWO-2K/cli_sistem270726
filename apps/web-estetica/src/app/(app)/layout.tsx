import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, empresa } = await requireUsuarioEmpresa();

  return (
    <AppShell
      empresaNome={empresa.nome}
      usuarioNome={usuario.nome}
      perfil={usuario.perfil}
    >
      {children}
    </AppShell>
  );
}
