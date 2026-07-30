-- Fase 1a: anamnese estética estruturada.
-- Tipo de pele e contraindicação por procedimento são conceitos específicos de
-- estética desde a raiz (campos mudam totalmente entre estética/fisio/odonto),
-- então nascem direto no schema da especialidade em vez de colunas soltas em
-- `anamneses` — primeira tabela do projeto fora do schema `public`.
create schema if not exists estetica;

create table estetica.anamnese_estetica (
  anamnese_id uuid primary key references public.anamneses (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo_pele smallint check (tipo_pele between 1 and 6),
  criado_em timestamptz not null default now()
);

create index anamnese_estetica_empresa_id_idx on estetica.anamnese_estetica (empresa_id);

alter table estetica.anamnese_estetica enable row level security;

-- Reaproveita a função genérica set_empresa_id() (public) — ela só seta
-- new.empresa_id a partir do usuário logado, não depende de qual tabela/schema
-- está disparando o trigger.
create trigger set_empresa_id_anamnese_estetica
  before insert on estetica.anamnese_estetica
  for each row execute function public.set_empresa_id();

create policy "anamnese_estetica: isolado por empresa" on estetica.anamnese_estetica for all
  using (empresa_id = public.auth_empresa_id())
  with check (empresa_id = public.auth_empresa_id());

-- Contraindicação por procedimento: tabela associativa (em vez de array) para
-- manter integridade referencial contra `procedimentos`.
create table estetica.anamnese_estetica_contraindicacao (
  anamnese_id uuid not null references estetica.anamnese_estetica (anamnese_id) on delete cascade,
  procedimento_id uuid not null references public.procedimentos (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  primary key (anamnese_id, procedimento_id)
);

create index anamnese_estetica_contraindicacao_empresa_id_idx
  on estetica.anamnese_estetica_contraindicacao (empresa_id);

alter table estetica.anamnese_estetica_contraindicacao enable row level security;

create trigger set_empresa_id_anamnese_estetica_contraindicacao
  before insert on estetica.anamnese_estetica_contraindicacao
  for each row execute function public.set_empresa_id();

create policy "anamnese_estetica_contraindicacao: isolado por empresa"
  on estetica.anamnese_estetica_contraindicacao for all
  using (empresa_id = public.auth_empresa_id())
  with check (empresa_id = public.auth_empresa_id());

-- PostgREST só expõe schemas listados em `api.schemas` (supabase/config.toml
-- local + "Exposed schemas" no dashboard do projeto remoto). Grants de tabela
-- por si só não bastam.
grant usage on schema estetica to authenticated;
grant select, insert, update, delete on estetica.anamnese_estetica to authenticated;
grant select, insert, update, delete on estetica.anamnese_estetica_contraindicacao to authenticated;
