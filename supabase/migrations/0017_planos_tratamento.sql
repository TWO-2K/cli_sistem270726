-- Fase 1d: plano de tratamento.
-- Sequência ordenada de etapas sugeridas para um paciente, com status de
-- progresso por etapa. Mesmo raciocínio de `pacotes_sessao` (0016): conceito
-- genérico entre estética/fisio/odonto, então nasce em `public`. Diferente de
-- pacotes_sessao, especialidades divergem na *estrutura* de uma etapa (odonto
-- associa a um dente, fisio nem sempre tem procedimento fixo) — por isso
-- `procedimento_id` é nullable aqui; campos realmente específicos entram como
-- extensão 1:1 por schema só quando aquele app nascer (ver memória
-- `schema_especialidades_futuras`).

create table planos_tratamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  paciente_id uuid not null references pacientes (id) on delete cascade,
  titulo text not null,
  status text not null default 'ativo' check (status in ('ativo', 'concluido', 'cancelado')),
  criado_em timestamptz not null default now()
);

create index planos_tratamento_empresa_id_idx on planos_tratamento (empresa_id);
create index planos_tratamento_paciente_id_idx on planos_tratamento (paciente_id);

create table plano_tratamento_etapas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  plano_id uuid not null references planos_tratamento (id) on delete cascade,
  ordem integer not null,
  procedimento_id uuid references procedimentos (id) on delete set null,
  descricao text not null,
  status text not null default 'pendente' check (status in ('pendente', 'concluida')),
  atendimento_id uuid references atendimentos (id) on delete set null,
  criado_em timestamptz not null default now()
);

create index plano_tratamento_etapas_empresa_id_idx on plano_tratamento_etapas (empresa_id);
create index plano_tratamento_etapas_plano_id_idx on plano_tratamento_etapas (plano_id);

alter table planos_tratamento enable row level security;
alter table plano_tratamento_etapas enable row level security;

create trigger set_empresa_id_planos_tratamento
  before insert on planos_tratamento
  for each row execute function set_empresa_id();

create trigger set_empresa_id_plano_tratamento_etapas
  before insert on plano_tratamento_etapas
  for each row execute function set_empresa_id();

create policy "planos_tratamento: isolado por empresa" on planos_tratamento for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

create policy "plano_tratamento_etapas: isolado por empresa" on plano_tratamento_etapas for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());
