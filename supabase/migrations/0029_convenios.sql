-- Fase 5b: convênios e tabela de preços por procedimento.
-- Mesmo padrão mecânico de `produtos`/`produto_procedimento` (0027): tabela
-- simples + tabela de junção com preço, isolamento por empresa_id/RLS/trigger.
-- Resolução do preço tabelado acontece no client (não RPC) — leitura simples
-- sem condição de corrida, mesmo raciocínio de `pacoteAtivo`/`etapaPlano` já
-- resolvidos hoje em `concluir-atendimento-dialog.tsx`.

create table convenios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index convenios_empresa_id_idx on convenios (empresa_id);
alter table convenios enable row level security;
create trigger set_empresa_id_convenios
  before insert on convenios
  for each row execute function set_empresa_id();
create policy "convenios: isolado por empresa" on convenios for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

create table tabela_precos_convenio (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  convenio_id uuid not null references convenios (id) on delete cascade,
  procedimento_id uuid not null references procedimentos (id) on delete cascade,
  preco numeric(10, 2) not null check (preco >= 0),
  unique (empresa_id, convenio_id, procedimento_id)
);
create index tabela_precos_convenio_empresa_id_idx on tabela_precos_convenio (empresa_id);
create index tabela_precos_convenio_convenio_id_idx on tabela_precos_convenio (convenio_id);
alter table tabela_precos_convenio enable row level security;
create trigger set_empresa_id_tabela_precos_convenio
  before insert on tabela_precos_convenio
  for each row execute function set_empresa_id();
create policy "tabela_precos_convenio: isolado por empresa" on tabela_precos_convenio for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

alter table pacientes
  add column convenio_id uuid references convenios (id) on delete set null;
create index pacientes_convenio_id_idx on pacientes (convenio_id);
