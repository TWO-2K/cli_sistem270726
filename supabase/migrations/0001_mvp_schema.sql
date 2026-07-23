-- MVP schema: núcleo operacional (Agenda, Pacientes, Atendimento/Prontuário,
-- Comanda, Financeiro básico, Permissões) com isolamento multi-tenant por clinica_id.

create extension if not exists "pgcrypto";

create type perfil as enum ('admin', 'recepcao', 'profissional', 'financeiro');
create type status_agendamento as enum (
  'agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'faltou'
);
create type status_atendimento as enum ('em_andamento', 'concluido');
create type status_comanda as enum ('aberta', 'fechada', 'cancelada');
create type status_pagamento as enum ('pendente', 'pago', 'atrasado', 'cancelado');

-- Clínica: raiz do isolamento multi-tenant.
create table clinicas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  segmento text,
  criado_em timestamptz not null default now()
);

-- Vínculo entre usuário autenticado (auth.users) e clínica + papel.
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  clinica_id uuid not null references clinicas (id) on delete cascade,
  nome text not null,
  email text not null,
  perfil perfil not null default 'recepcao',
  criado_em timestamptz not null default now()
);
create index usuarios_clinica_id_idx on usuarios (clinica_id);

create table pacientes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  data_nascimento date,
  endereco text,
  criado_em timestamptz not null default now()
);
create index pacientes_clinica_id_idx on pacientes (clinica_id);

create table profissionais (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  nome text not null,
  especialidade text,
  ativo boolean not null default true
);
create index profissionais_clinica_id_idx on profissionais (clinica_id);

create table salas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  nome text not null
);
create index salas_clinica_id_idx on salas (clinica_id);

create table procedimentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  nome text not null,
  duracao_minutos integer not null default 30,
  preco numeric(10, 2) not null default 0
);
create index procedimentos_clinica_id_idx on procedimentos (clinica_id);

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  paciente_id uuid not null references pacientes (id) on delete cascade,
  profissional_id uuid not null references profissionais (id) on delete restrict,
  sala_id uuid references salas (id) on delete set null,
  procedimento_id uuid references procedimentos (id) on delete set null,
  data_hora timestamptz not null,
  duracao_minutos integer not null default 30,
  status status_agendamento not null default 'agendado',
  observacoes text
);
create index agendamentos_clinica_id_idx on agendamentos (clinica_id);
create index agendamentos_profissional_data_idx on agendamentos (profissional_id, data_hora);

create table prontuarios (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  paciente_id uuid not null unique references pacientes (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table anamneses (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  paciente_id uuid not null references pacientes (id) on delete cascade,
  respostas jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index anamneses_clinica_id_idx on anamneses (clinica_id);

create table atendimentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  agendamento_id uuid references agendamentos (id) on delete set null,
  paciente_id uuid not null references pacientes (id) on delete cascade,
  profissional_id uuid not null references profissionais (id) on delete restrict,
  procedimento_id uuid references procedimentos (id) on delete set null,
  status status_atendimento not null default 'em_andamento',
  criado_em timestamptz not null default now()
);
create index atendimentos_clinica_id_idx on atendimentos (clinica_id);
create index atendimentos_paciente_id_idx on atendimentos (paciente_id);

create table evolucoes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  paciente_id uuid not null references pacientes (id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now()
);
create index evolucoes_clinica_id_idx on evolucoes (clinica_id);

create table fotos_atendimento (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  paciente_id uuid not null references pacientes (id) on delete cascade,
  url text not null,
  tipo text not null default 'antes' check (tipo in ('antes', 'depois')),
  criado_em timestamptz not null default now()
);
create index fotos_atendimento_clinica_id_idx on fotos_atendimento (clinica_id);

create table comandas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  atendimento_id uuid references atendimentos (id) on delete set null,
  paciente_id uuid not null references pacientes (id) on delete cascade,
  status status_comanda not null default 'aberta',
  total numeric(10, 2) not null default 0,
  criado_em timestamptz not null default now()
);
create index comandas_clinica_id_idx on comandas (clinica_id);

create table comanda_itens (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  comanda_id uuid not null references comandas (id) on delete cascade,
  procedimento_id uuid references procedimentos (id) on delete set null,
  descricao text not null,
  quantidade integer not null default 1,
  valor_unitario numeric(10, 2) not null default 0
);
create index comanda_itens_clinica_id_idx on comanda_itens (clinica_id);
create index comanda_itens_comanda_id_idx on comanda_itens (comanda_id);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  comanda_id uuid not null references comandas (id) on delete cascade,
  forma_pagamento text not null,
  valor numeric(10, 2) not null,
  status status_pagamento not null default 'pendente',
  criado_em timestamptz not null default now()
);
create index pagamentos_clinica_id_idx on pagamentos (clinica_id);

create table parcelas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas (id) on delete cascade,
  pagamento_id uuid not null references pagamentos (id) on delete cascade,
  vencimento date not null,
  valor numeric(10, 2) not null,
  status status_pagamento not null default 'pendente'
);
create index parcelas_clinica_id_idx on parcelas (clinica_id);

-- Função auxiliar: clinica_id do usuário autenticado atual.
create or replace function auth_clinica_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinica_id from usuarios where id = auth.uid();
$$;

-- RLS: habilita e restringe todo acesso ao clinica_id do usuário autenticado.
alter table clinicas enable row level security;
alter table usuarios enable row level security;
alter table pacientes enable row level security;
alter table profissionais enable row level security;
alter table salas enable row level security;
alter table procedimentos enable row level security;
alter table agendamentos enable row level security;
alter table prontuarios enable row level security;
alter table anamneses enable row level security;
alter table atendimentos enable row level security;
alter table evolucoes enable row level security;
alter table fotos_atendimento enable row level security;
alter table comandas enable row level security;
alter table comanda_itens enable row level security;
alter table pagamentos enable row level security;
alter table parcelas enable row level security;

create policy "clinica: membro pode ver a própria clínica"
  on clinicas for select
  using (id = auth_clinica_id());

-- Onboarding: qualquer usuário autenticado pode criar a clínica inicial
-- (o vínculo usuário→clínica só passa a existir no passo seguinte).
create policy "clinica: usuário autenticado pode criar"
  on clinicas for insert
  with check (auth.uid() is not null);

create policy "usuarios: apenas da própria clínica"
  on usuarios for select
  using (clinica_id = auth_clinica_id());

-- Onboarding: usuário só pode criar o próprio vínculo (id = auth.uid()),
-- e apenas enquanto ainda não pertence a nenhuma clínica.
create policy "usuarios: usuário pode criar o próprio vínculo"
  on usuarios for insert
  with check (id = auth.uid() and auth_clinica_id() is null);

create policy "usuarios: usuário pode atualizar o próprio registro"
  on usuarios for update
  using (id = auth.uid());

-- Trigger: força clinica_id = auth_clinica_id() em todo insert/update,
-- para que o client nunca precise (nem consiga) informar outra clínica.
create or replace function set_clinica_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.clinica_id := auth_clinica_id();
  return new;
end;
$$;

-- Política padrão (CRUD completo) para as demais tabelas de negócio:
-- todo acesso restrito ao clinica_id do usuário autenticado.
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'pacientes', 'profissionais', 'salas', 'procedimentos', 'agendamentos',
    'prontuarios', 'anamneses', 'atendimentos', 'evolucoes', 'fotos_atendimento',
    'comandas', 'comanda_itens', 'pagamentos', 'parcelas'
  ]
  loop
    execute format(
      'create policy "%1$s: isolado por clinica" on %1$s for all
        using (clinica_id = auth_clinica_id())
        with check (clinica_id = auth_clinica_id());',
      tabela
    );
    execute format(
      'create trigger set_clinica_id_%1$s
        before insert on %1$s
        for each row execute function set_clinica_id();',
      tabela
    );
  end loop;
end $$;
