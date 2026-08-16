export type Perfil =
  | "super_admin"
  | "admin"
  | "recepcao"
  | "profissional"
  | "financeiro";

export const SEGMENTOS = ["estetica", "odonto", "fisio"] as const;
export type Segmento = (typeof SEGMENTOS)[number];
export const SEGMENTO_LABELS: Record<Segmento, string> = {
  estetica: "Estética",
  odonto: "Odontologia",
  fisio: "Fisioterapia",
};

export interface HorarioDia {
  ativo: boolean;
  inicio: string;
  fim: string;
}

export const EMPRESA_STATUS = ["ativa", "suspensa"] as const;
export type EmpresaStatus = (typeof EMPRESA_STATUS)[number];
export const EMPRESA_STATUS_LABELS: Record<EmpresaStatus, string> = {
  ativa: "Ativa",
  suspensa: "Suspensa",
};

export interface Empresa {
  id: string;
  nome: string;
  segmento: Segmento;
  status: EmpresaStatus;
  cnpj: string | null;
  endereco: string | null;
  email: string | null;
  horario_funcionamento: HorarioDia[];
  is_teste: boolean;
  criado_em: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface Usuario {
  id: string;
  empresa_id: string | null;
  unidade_id: string | null;
  nome: string;
  email: string;
  perfil: Perfil;
  must_change_password: boolean;
  especialidade: string | null;
  atende: boolean;
  ativo: boolean;
  horario_funcionamento: HorarioDia[] | null;
}

export interface AuditLog {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  usuario_nome: string;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  criado_em: string;
}
