import { requireUsuarioClinica as requireUsuarioClinicaCore } from "@clinica/auth";
import type { Perfil } from "@clinica/supabase/types";

export function requireUsuarioClinica(perfisPermitidos?: Perfil[]) {
  return requireUsuarioClinicaCore(
    {
      login: "/login",
      superAdmin: "/admin",
      mustChangePassword: "/mudar-senha",
      forbidden: "/dashboard",
    },
    perfisPermitidos,
  );
}
