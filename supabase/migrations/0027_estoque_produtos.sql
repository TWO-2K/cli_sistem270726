-- Fase 5a: estoque de produtos/insumos.
-- Conceito genérico entre especialidades (qualquer clínica com insumo
-- consumível) — nasce em `public`, mesmo padrão de RLS/trigger das demais
-- tabelas. `produto_procedimento` é o vínculo produto↔procedimento (quanto
-- cada procedimento consome de cada produto), usado pela RPC
-- `baixar_estoque_procedimento` (0028) ao concluir atendimento. Sem tabela
-- de log de movimentação nesta fase: o escopo pedido é só baixa automática +
-- alerta de estoque baixo, nenhum dos dois exige histórico.

create table produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nome text not null,
  unidade_medida text not null default 'un',
  estoque_atual numeric(10, 2) not null default 0,
  estoque_minimo numeric(10, 2) not null default 0 check (estoque_minimo >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table produto_procedimento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete cascade,
  procedimento_id uuid not null references procedimentos (id) on delete cascade,
  quantidade_consumida numeric(10, 2) not null check (quantidade_consumida > 0),
  unique (empresa_id, produto_id, procedimento_id)
);

create index produtos_empresa_id_idx on produtos (empresa_id);
create index produto_procedimento_empresa_id_idx on produto_procedimento (empresa_id);
create index produto_procedimento_procedimento_id_idx on produto_procedimento (procedimento_id);

alter table produtos enable row level security;
alter table produto_procedimento enable row level security;

create trigger set_empresa_id_produtos
  before insert on produtos
  for each row execute function set_empresa_id();

create trigger set_empresa_id_produto_procedimento
  before insert on produto_procedimento
  for each row execute function set_empresa_id();

create policy "produtos: isolado por empresa" on produtos for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

create policy "produto_procedimento: isolado por empresa" on produto_procedimento for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());
