import "server-only";
import { redirect } from "next/navigation";
import { createServerClient } from "@empresa/supabase";
import type { Usuario, Empresa, Perfil, Segmento } from "@empresa/supabase/types";
import { logger } from "@empresa/observability/logger";

export interface RequireUsuarioEmpresaRedirects {
  login: string;
  superAdmin: string;
  mustChangePassword: string;
  forbidden: string;
}

export async function requireUsuarioEmpresa(
  redirects: RequireUsuarioEmpresaRedirects,
  perfisPermitidos?: Perfil[],
  segmentoPermitido?: Segmento,
): Promise<{
  usuario: Usuario;
  empresa: Empresa;
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
    logger.warn("acesso negado", {
      usuarioId: usuario.id,
      perfil: usuario.perfil,
      perfisPermitidos,
    });
    redirect(redirects.forbidden);
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", usuario.empresa_id)
    .single();

  if (!empresa) {
    redirect(redirects.login);
  }

  if (empresa.status === "suspensa") {
    logger.warn("acesso negado: empresa suspensa", {
      usuarioId: usuario.id,
      empresaId: empresa.id,
    });
    redirect(redirects.login);
  }

  if (segmentoPermitido && empresa.segmento !== segmentoPermitido) {
    redirect(redirects.login);
  }

  return { usuario, empresa };
}
