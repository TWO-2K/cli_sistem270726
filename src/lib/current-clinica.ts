import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Usuario, Clinica } from "@/lib/types/db";

export async function requireUsuarioClinica(): Promise<{
  usuario: Usuario;
  clinica: Clinica;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.perfil === "super_admin") {
    redirect("/admin");
  }

  if (usuario.must_change_password) {
    redirect("/mudar-senha");
  }

  const { data: clinica } = await supabase
    .from("clinicas")
    .select("*")
    .eq("id", usuario.clinica_id)
    .single();

  if (!clinica) {
    redirect("/login");
  }

  return { usuario, clinica };
}
