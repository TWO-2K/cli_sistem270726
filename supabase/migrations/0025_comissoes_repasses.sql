-- Fase 4b.1: fechamento mensal de comissões (repasse consolidado por
-- profissional), substituindo o pagamento linha-a-linha de
-- `comissoes_lancadas` pelo fluxo real de mercado: comissão é apurada
-- mensalmente, consolidada num único repasse por profissional, e paga em
-- lote. `comissoes_lancadas.repasse_id` liga cada lançamento ao repasse que
-- o quitou (FK, não período computado — um lançamento atrasado não reabre
-- um mês já fechado, só entra no próximo fechamento).
--
-- Modelo de status em duas camadas: ao fechar o mês, o `status` individual
-- de `comissoes_lancadas` vira 'pago' (significa "já contabilizado num
-- repasse", não que o dinheiro saiu). Quem carrega o status financeiro real
-- é `comissoes_repasses.status`, com seu próprio ciclo 'pendente' -> 'pago'.

create table comissoes_repasses (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  usuario_id uuid not null references usuarios (id) on delete cascade,
  competencia date not null,
  valor_total numeric(10, 2) not null check (valor_total > 0),
  status status_pagamento not null default 'pendente',
  forma_pagamento text,
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (empresa_id, usuario_id, competencia)
);

alter table comissoes_lancadas
  add column repasse_id uuid references comissoes_repasses (id) on delete set null;

create index comissoes_repasses_empresa_id_idx on comissoes_repasses (empresa_id);
create index comissoes_repasses_usuario_id_idx on comissoes_repasses (usuario_id);
create index comissoes_lancadas_repasse_id_idx on comissoes_lancadas (repasse_id);

alter table comissoes_repasses enable row level security;

create trigger set_empresa_id_comissoes_repasses
  before insert on comissoes_repasses
  for each row execute function set_empresa_id();

create policy "comissoes_repasses: isolado por empresa" on comissoes_repasses for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

-- Consolida os lançamentos pendentes (ainda não vinculados a um repasse) de
-- um profissional dentro do mês de p_competencia num único repasse. Erra se
-- não houver nada pendente (não cria repasse vazio) — isso também cobre
-- fechar o mesmo profissional+mês duas vezes, já que a 1a chamada já deixa
-- repasse_id preenchido em todas as linhas encontradas.
create or replace function fechar_comissoes_mes(
  p_usuario_id uuid,
  p_competencia date
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_competencia date := date_trunc('month', p_competencia)::date;
  v_total numeric(10, 2);
  v_repasse_id uuid;
begin
  select coalesce(sum(valor_comissao), 0) into v_total
  from comissoes_lancadas
  where usuario_id = p_usuario_id
    and status = 'pendente'
    and repasse_id is null
    and criado_em >= v_competencia
    and criado_em < (v_competencia + interval '1 month');

  if v_total <= 0 then
    raise exception 'Nenhuma comissão pendente para este profissional neste mês.';
  end if;

  insert into comissoes_repasses (usuario_id, competencia, valor_total, status)
  values (p_usuario_id, v_competencia, v_total, 'pendente')
  returning id into v_repasse_id;

  update comissoes_lancadas
  set repasse_id = v_repasse_id, status = 'pago'
  where usuario_id = p_usuario_id
    and status = 'pendente'
    and repasse_id is null
    and criado_em >= v_competencia
    and criado_em < (v_competencia + interval '1 month');

  return jsonb_build_object('repasse_id', v_repasse_id, 'valor_total', v_total);
end;
$$;

grant execute on function fechar_comissoes_mes(uuid, date) to authenticated;
