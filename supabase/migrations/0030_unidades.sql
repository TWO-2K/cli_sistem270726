-- Fase 5c: múltiplas unidades/filiais. Primeira migration só cria a tabela
-- `unidades` (catálogo por empresa) — o vínculo com usuarios/tabelas
-- operacionais entra na migration seguinte (0031), que também precisa desta
-- tabela já existir para as FKs.

create table unidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  endereco text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index unidades_empresa_id_idx on unidades (empresa_id);

alter table unidades enable row level security;

create trigger set_empresa_id_unidades
  before insert on unidades
  for each row execute function set_empresa_id();

create policy "unidades: isolado por empresa" on unidades for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());
