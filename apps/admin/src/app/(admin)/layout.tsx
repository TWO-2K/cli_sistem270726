import { redirect } from "next/navigation";
import { createClient } from "@empresa/supabase/server";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("perfil, nome, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (usuario?.perfil !== "super_admin") {
    redirect("/login");
  }

  if (usuario.must_change_password) {
    redirect("/mudar-senha");
  }

  return (
    <div className="h-svh">
      <AdminSidebar usuarioNome={usuario.nome} />
      <main className="flex h-svh flex-col overflow-hidden bg-muted/20 p-4 pt-18 md:py-6 md:pr-6 md:pl-[calc(var(--spacing)*64+1.5rem)]">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
