import { requireUsuarioEmpresa as requireUsuarioEmpresaCore } from "@empresa/auth";
import type { Perfil } from "@empresa/supabase/types";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:1000";

export function requireUsuarioEmpresa(perfisPermitidos?: Perfil[]) {
  return requireUsuarioEmpresaCore(
    {
      login: "/login",
      superAdmin: ADMIN_URL,
      mustChangePassword: "/mudar-senha",
      forbidden: "/painel",
    },
    perfisPermitidos,
    "estetica",
  );
}
