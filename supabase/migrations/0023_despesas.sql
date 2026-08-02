-- Fase 4a: contas a pagar / despesas.
-- Conceito genérico entre especialidades (aluguel, folha, fornecedores), mesma
-- regra já usada para leads/planos_tratamento — nasce em `public`. Reaproveita
-- o enum `status_pagamento` (0001) já usado por pagamentos/parcelas. Sem RPC:
-- é CRUD de tabela única, sem atomicidade multi-tabela envolvida (mesmo
-- raciocínio de `planos_tratamento`, 0017).

create table despesas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  descricao text not null,
  categoria text not null,
  valor numeric(10, 2) not null check (valor > 0),
  vencimento date not null,
  status status_pagamento not null default 'pendente',
  pago_em timestamptz,
  fornecedor text,
  recorrente boolean not null default false,
  criado_em timestamptz not null default now()
);

create index despesas_empresa_id_idx on despesas (empresa_id);
create index despesas_vencimento_idx on despesas (vencimento);

alter table despesas enable row level security;

create trigger set_empresa_id_despesas
  before insert on despesas
  for each row execute function set_empresa_id();

create policy "despesas: isolado por empresa" on despesas for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());
