import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "./admin-header";

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
    <div className="flex min-h-full flex-1 flex-col">
      <AdminHeader usuarioNome={usuario.nome} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
