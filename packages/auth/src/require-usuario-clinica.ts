import "server-only";
import { redirect } from "next/navigation";
import { createServerClient } from "@clinica/supabase";
import type { Usuario, Clinica, Perfil } from "@clinica/supabase/types";

export interface RequireUsuarioClinicaRedirects {
  login: string;
  superAdmin: string;
  mustChangePassword: string;
  forbidden: string;
}

export async function requireUsuarioClinica(
  redirects: RequireUsuarioClinicaRedirects,
  perfisPermitidos?: Perfil[],
): Promise<{
  usuario: Usuario;
  clinica: Clinica;
}> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(redirects.login);
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!usuario) {
    redirect(redirects.login);
  }

  if (usuario.perfil === "super_admin") {
    redirect(redirects.superAdmin);
  }

  if (usuario.must_change_password) {
    redirect(redirects.mustChangePassword);
  }

  if (perfisPermitidos && !perfisPermitidos.includes(usuario.perfil)) {
    redirect(redirects.forbidden);
  }

  const { data: clinica } = await supabase
    .from("clinicas")
    .select("*")
    .eq("id", usuario.clinica_id)
    .single();

  if (!clinica) {
    redirect(redirects.login);
  }

  return { usuario, clinica };
}
