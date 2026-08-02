-- Fase 3: aquisição de pacientes (CRM / funil de leads).
-- Conceito genérico (captar contato, acompanhar estágio até virar paciente)
-- que se aplica igualmente a estética/fisio/odonto sem mudar de estrutura,
-- então nasce em `public` (mesma regra já usada para pacotes_sessao/
-- planos_tratamento) — sem tabela de extensão por especialidade até haver
-- um campo realmente específico de alguma delas.

create table leads (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  contato text not null,
  origem text,
  estagio text not null default 'novo'
    check (estagio in ('novo', 'contatado', 'agendou', 'convertido', 'perdido')),
  responsavel_id uuid references usuarios (id) on delete set null,
  paciente_id uuid references pacientes (id) on delete set null,
  motivo_perda text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index leads_empresa_id_idx on leads (empresa_id);
create index leads_estagio_idx on leads (estagio);
create index leads_responsavel_id_idx on leads (responsavel_id);

alter table leads enable row level security;

create trigger set_empresa_id_leads
  before insert on leads
  for each row execute function set_empresa_id();

create policy "leads: isolado por empresa" on leads for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());
