import type { Segmento } from "@empresa/supabase/types";

/**
 * Estilos por segmento de empresa, reaproveitando a mesma paleta usada
 * dentro do app da clínica (`--modulo-estetica` / `--modulo-fisioterapia` /
 * `--modulo-odontologia`) para dar identidade visual imediata a cada
 * empresa no painel admin, sem inventar cores fora do tema. Compartilhado
 * entre `page.tsx` (cards de empresa) e `empresas/[id]/page.tsx` (badge de
 * segmento no detalhe).
 */
export const SEGMENTO_BADGE: Record<Segmento, string> = {
  estetica:
    "border-modulo-estetica/30 bg-modulo-estetica/10 text-modulo-estetica",
  odonto:
    "border-modulo-odontologia/30 bg-modulo-odontologia/10 text-modulo-odontologia",
  fisio:
    "border-modulo-fisioterapia/30 bg-modulo-fisioterapia/10 text-modulo-fisioterapia",
};

export const SEGMENTO_BORDER_VAR: Record<Segmento, string> = {
  estetica: "var(--modulo-estetica)",
  odonto: "var(--modulo-odontologia)",
  fisio: "var(--modulo-fisioterapia)",
};
