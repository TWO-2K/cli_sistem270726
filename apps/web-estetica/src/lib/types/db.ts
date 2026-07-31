export type { Perfil, HorarioDia, Empresa, Usuario } from "@empresa/supabase/types";

export type StatusAgendamento =
  | "agendado"
  | "confirmado"
  | "em_atendimento"
  | "concluido"
  | "cancelado"
  | "faltou";

export type StatusComanda = "aberta" | "fechada" | "cancelada";

export type StatusPagamento = "pendente" | "pago" | "atrasado" | "cancelado";

export interface Paciente {
  id: string;
  empresa_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  criado_em: string;
}

export interface Sala {
  id: string;
  empresa_id: string;
  nome: string;
}

export interface Procedimento {
  id: string;
  empresa_id: string;
  nome: string;
  duracao_minutos: number;
  preco: number;
}

export interface Agendamento {
  id: string;
  empresa_id: string;
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
  empresa_id: string;
  agendamento_id: string | null;
  paciente_id: string;
  usuario_id: string;
  procedimento_id: string | null;
  anamnese_id: string | null;
  status: "em_andamento" | "concluido";
  criado_em: string;
}

export interface Evolucao {
  id: string;
  empresa_id: string;
  atendimento_id: string;
  paciente_id: string;
  texto: string;
  criado_em: string;
}

export interface FotoAtendimento {
  id: string;
  empresa_id: string;
  atendimento_id: string;
  paciente_id: string;
  url: string;
  tipo: "antes" | "depois";
  criado_em: string;
}

export interface Comanda {
  id: string;
  empresa_id: string;
  atendimento_id: string | null;
  paciente_id: string;
  status: StatusComanda;
  total: number;
  criado_em: string;
}

export interface ComandaItem {
  id: string;
  empresa_id: string;
  comanda_id: string;
  procedimento_id: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

export interface Pagamento {
  id: string;
  empresa_id: string;
  comanda_id: string;
  forma_pagamento: string;
  valor: number;
  status: StatusPagamento;
  criado_em: string;
}

export interface Parcela {
  id: string;
  empresa_id: string;
  pagamento_id: string;
  vencimento: string;
  valor: number;
  status: StatusPagamento;
}

export interface Prontuario {
  id: string;
  empresa_id: string;
  paciente_id: string;
  criado_em: string;
}

export interface AnamneseRespostas {
  queixa_principal: string;
  historico_saude: string;
  alergias: string;
  medicacoes_em_uso: string;
  procedimentos_anteriores: string;
}

export interface Anamnese {
  id: string;
  empresa_id: string;
  paciente_id: string;
  respostas: AnamneseRespostas;
  criado_em: string;
}

/** Classificação Fitzpatrick (I a VI) de fototipo de pele. */
export type TipoPele = 1 | 2 | 3 | 4 | 5 | 6;

export const TIPO_PELE_LABELS: Record<TipoPele, string> = {
  1: "I — Pele muito clara, sempre queima, nunca bronzeia",
  2: "II — Pele clara, queima com facilidade, bronzeia pouco",
  3: "III — Pele morena clara, queima moderadamente, bronzeia gradualmente",
  4: "IV — Pele morena moderada, queima pouco, bronzeia bem",
  5: "V — Pele morena escura, raramente queima, bronzeia intensamente",
  6: "VI — Pele negra, nunca queima",
};

export interface AnamneseEstetica {
  anamnese_id: string;
  empresa_id: string;
  tipo_pele: TipoPele | null;
  criado_em: string;
}

export interface AnamneseEsteticaContraindicacao {
  anamnese_id: string;
  procedimento_id: string;
  empresa_id: string;
}

export interface PacoteSessao {
  id: string;
  empresa_id: string;
  paciente_id: string;
  procedimento_id: string;
  comanda_item_id: string | null;
  sessoes_total: number;
  sessoes_utilizadas: number;
  criado_em: string;
}

export type StatusPlanoTratamento = "ativo" | "concluido" | "cancelado";

export interface PlanoTratamento {
  id: string;
  empresa_id: string;
  paciente_id: string;
  titulo: string;
  status: StatusPlanoTratamento;
  criado_em: string;
}

export type StatusEtapaPlanoTratamento = "pendente" | "concluida";

export interface PlanoTratamentoEtapa {
  id: string;
  empresa_id: string;
  plano_id: string;
  ordem: number;
  procedimento_id: string | null;
  descricao: string;
  status: StatusEtapaPlanoTratamento;
  atendimento_id: string | null;
  criado_em: string;
}
