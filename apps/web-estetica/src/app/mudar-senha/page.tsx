import { redirect } from "next/navigation";
import { createClient } from "@empresa/supabase/server";
import { MudarSenhaForm } from "./mudar-senha-form";

export default async function MudarSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("perfil, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (!usuario) {
    redirect("/login");
  }

  if (!usuario.must_change_password) {
    redirect(usuario.perfil === "super_admin" ? "/admin" : "/painel");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/40 p-4">
      <MudarSenhaForm
        destino={usuario.perfil === "super_admin" ? "/admin" : "/painel"}
      />
    </div>
  );
}
