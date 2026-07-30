import { redirect } from "next/navigation";
import { createClient } from "@empresa/supabase/server";
import { MudarSenhaForm } from "../mudar-senha/mudar-senha-form";

export default async function RedefinirSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("perfil")
    .eq("id", user.id)
    .maybeSingle();

  if (!usuario) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/40 p-4">
      <MudarSenhaForm
        destino={usuario.perfil === "super_admin" ? "/admin" : "/dashboard"}
        titulo="Redefinir senha"
        descricao="Escolha uma nova senha para sua conta."
      />
    </div>
  );
}
