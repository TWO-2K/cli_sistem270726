export type { Perfil, HorarioDia, Empresa, Usuario, AuditLog } from "@empresa/supabase/types";

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
  convenio_id: string | null;
  criado_em: string;
}

export interface Unidade {
  id: string;
  empresa_id: string;
  nome: string;
  endereco: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface Sala {
  id: string;
  empresa_id: string;
  unidade_id: string | null;
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
  unidade_id: string | null;
  paciente_id: string;
  usuario_id: string;
  sala_id: string | null;
  procedimento_id: string | null;
  data_hora: string;
  duracao_minutos: number;
  status: StatusAgendamento;
  observacoes: string | null;
  lembrete_enviado_em: string | null;
  token_confirmacao: string;
}

export interface Atendimento {
  id: string;
  empresa_id: string;
  unidade_id: string | null;
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
  unidade_id: string | null;
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
  unidade_id: string | null;
  comanda_id: string;
  forma_pagamento: string;
  valor: number;
  status: StatusPagamento;
  criado_em: string;
}

export interface Parcela {
  id: string;
  empresa_id: string;
  unidade_id: string | null;
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

export type EstagioLead =
  | "novo"
  | "contatado"
  | "agendou"
  | "convertido"
  | "perdido";

export const ESTAGIOS_LEAD: EstagioLead[] = [
  "novo",
  "contatado",
  "agendou",
  "convertido",
  "perdido",
];

export const ESTAGIO_LEAD_LABELS: Record<EstagioLead, string> = {
  novo: "Novo",
  contatado: "Contatado",
  agendou: "Agendou",
  convertido: "Convertido",
  perdido: "Perdido",
};

export interface Lead {
  id: string;
  empresa_id: string;
  nome: string;
  contato: string;
  origem: string | null;
  estagio: EstagioLead;
  responsavel_id: string | null;
  paciente_id: string | null;
  motivo_perda: string | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

export const CATEGORIAS_DESPESA = [
  "Aluguel",
  "Folha de pagamento",
  "Fornecedores",
  "Marketing",
  "Manutenção",
  "Impostos",
  "Outros",
] as const;

export type CategoriaDespesa = (typeof CATEGORIAS_DESPESA)[number];

export interface Despesa {
  id: string;
  empresa_id: string;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  status: StatusPagamento;
  pago_em: string | null;
  fornecedor: string | null;
  recorrente: boolean;
  criado_em: string;
}

export interface ComissaoProfissional {
  id: string;
  empresa_id: string;
  usuario_id: string;
  percentual: number;
  criado_em: string;
}

export interface ComissaoProcedimento {
  id: string;
  empresa_id: string;
  procedimento_id: string;
  percentual: number;
  criado_em: string;
}

export interface ComissaoProfissionalProcedimento {
  id: string;
  empresa_id: string;
  usuario_id: string;
  procedimento_id: string;
  percentual: number;
  criado_em: string;
}

export interface ComissaoLancada {
  id: string;
  empresa_id: string;
  pagamento_id: string;
  usuario_id: string;
  comanda_id: string;
  percentual_aplicado: number;
  valor_base: number;
  valor_comissao: number;
  status: StatusPagamento;
  repasse_id: string | null;
  criado_em: string;
}

export const FORMAS_REPASSE = [
  "Pix",
  "Transferência bancária",
  "Dinheiro",
  "Incluso na folha",
] as const;

export type FormaRepasse = (typeof FORMAS_REPASSE)[number];

export interface ComissaoRepasse {
  id: string;
  empresa_id: string;
  usuario_id: string;
  competencia: string;
  valor_total: number;
  status: StatusPagamento;
  forma_pagamento: string | null;
  pago_em: string | null;
  criado_em: string;
}

export interface Produto {
  id: string;
  empresa_id: string;
  nome: string;
  unidade_medida: string;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  criado_em: string;
}

export interface ProdutoProcedimento {
  id: string;
  empresa_id: string;
  produto_id: string;
  procedimento_id: string;
  quantidade_consumida: number;
}

export interface Convenio {
  id: string;
  empresa_id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
}

export interface TabelaPrecoConvenio {
  id: string;
  empresa_id: string;
  convenio_id: string;
  procedimento_id: string;
  preco: number;
}

export type PeriodoDia = "manha" | "tarde" | "noite" | "qualquer";
export type StatusListaEspera = "aguardando" | "convertido" | "cancelado";

export interface ListaEspera {
  id: string;
  empresa_id: string;
  paciente_id: string;
  profissional_id: string | null;
  procedimento_id: string | null;
  disponibilidade_inicio: string;
  disponibilidade_fim: string;
  periodo_dia: PeriodoDia;
  observacoes: string | null;
  status: StatusListaEspera;
  oferta_agendamento_id: string | null;
  oferta_token: string | null;
  oferta_expira_em: string | null;
  agendamento_id: string | null;
  criado_em: string;
  atualizado_em: string;
}
