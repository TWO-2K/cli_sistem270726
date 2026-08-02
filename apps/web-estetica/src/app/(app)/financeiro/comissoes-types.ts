import type { ComissaoLancada, ComissaoRepasse } from "@/lib/types/db";

export type ComissaoLancadaComNomes = ComissaoLancada & {
  usuarios: { nome: string } | null;
  comandas: { pacientes: { nome: string } | null } | null;
};

export type ComissaoRepasseComNome = ComissaoRepasse & {
  usuarios: { nome: string } | null;
};
