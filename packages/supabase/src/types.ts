export type Perfil =
  | "super_admin"
  | "admin"
  | "recepcao"
  | "profissional"
  | "financeiro";

export interface HorarioDia {
  ativo: boolean;
  inicio: string;
  fim: string;
}

export interface Clinica {
  id: string;
  nome: string;
  segmento: string | null;
  cnpj: string | null;
  endereco: string | null;
  email: string | null;
  horario_funcionamento: HorarioDia[];
  criado_em: string;
}

export interface Usuario {
  id: string;
  clinica_id: string | null;
  nome: string;
  email: string;
  perfil: Perfil;
  must_change_password: boolean;
  especialidade: string | null;
  atende: boolean;
  ativo: boolean;
}
