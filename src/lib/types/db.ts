export type Perfil =
  | "super_admin"
  | "admin"
  | "recepcao"
  | "profissional"
  | "financeiro";

export type StatusAgendamento =
  | "agendado"
  | "confirmado"
  | "em_atendimento"
  | "concluido"
  | "cancelado"
  | "faltou";

export type StatusComanda = "aberta" | "fechada" | "cancelada";

export type StatusPagamento = "pendente" | "pago" | "atrasado" | "cancelado";

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

export interface Paciente {
  id: string;
  clinica_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  criado_em: string;
}

export interface Sala {
  id: string;
  clinica_id: string;
  nome: string;
}

export interface Procedimento {
  id: string;
  clinica_id: string;
  nome: string;
  duracao_minutos: number;
  preco: number;
}

export interface Agendamento {
  id: string;
  clinica_id: string;
  paciente_id: string;
  usuario_id: string;
  sala_id: string | null;
  procedimento_id: string | null;
  data_hora: string;
  duracao_minutos: number;
  status: StatusAgendamento;
  observacoes: string | null;
}

export interface Atendimento {
  id: string;
  clinica_id: string;
  agendamento_id: string | null;
  paciente_id: string;
  usuario_id: string;
  procedimento_id: string | null;
  status: "em_andamento" | "concluido";
  criado_em: string;
}

export interface Evolucao {
  id: string;
  clinica_id: string;
  atendimento_id: string;
  paciente_id: string;
  texto: string;
  criado_em: string;
}

export interface FotoAtendimento {
  id: string;
  clinica_id: string;
  atendimento_id: string;
  paciente_id: string;
  url: string;
  tipo: "antes" | "depois";
  criado_em: string;
}

export interface Comanda {
  id: string;
  clinica_id: string;
  atendimento_id: string | null;
  paciente_id: string;
  status: StatusComanda;
  total: number;
  criado_em: string;
}

export interface Pagamento {
  id: string;
  clinica_id: string;
  comanda_id: string;
  forma_pagamento: string;
  valor: number;
  status: StatusPagamento;
  criado_em: string;
}
