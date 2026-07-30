-- Fase 1c: pacotes de sessões.
-- Conceito genérico (comprar N sessões adiantado, consumir 1 por atendimento)
-- que se aplica igualmente a estética/fisio/odonto sem mudar de estrutura,
-- então nasce em `public` (mesma regra já usada para o resto do schema) — sem
-- versão em `estetica`. Ver `pacote_sessao_consumos` para o histórico/trava de
-- idempotência do abate.

create table pacotes_sessao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  paciente_id uuid not null references pacientes (id) on delete cascade,
  procedimento_id uuid not null references procedimentos (id) on delete restrict,
  comanda_item_id uuid references comanda_itens (id) on delete set null,
  sessoes_total integer not null check (sessoes_total > 0),
  sessoes_utilizadas integer not null default 0 check (sessoes_utilizadas >= 0),
  criado_em timestamptz not null default now(),
  constraint pacotes_sessao_utilizadas_nao_excede_total
    check (sessoes_utilizadas <= sessoes_total)
);

create index pacotes_sessao_empresa_id_idx on pacotes_sessao (empresa_id);
create index pacotes_sessao_paciente_id_idx on pacotes_sessao (paciente_id);

-- Histórico de abate: 1 linha por atendimento que consumiu 1 sessão de um
-- pacote. `unique (atendimento_id)` garante que o mesmo atendimento nunca
-- abate 2 sessões (idempotência), mesmo com múltiplas chamadas da RPC.
create table pacote_sessao_consumos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  pacote_id uuid not null references pacotes_sessao (id) on delete cascade,
  atendimento_id uuid not null references atendimentos (id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (atendimento_id)
);

create index pacote_sessao_consumos_empresa_id_idx on pacote_sessao_consumos (empresa_id);
create index pacote_sessao_consumos_pacote_id_idx on pacote_sessao_consumos (pacote_id);

alter table pacotes_sessao enable row level security;
alter table pacote_sessao_consumos enable row level security;

create trigger set_empresa_id_pacotes_sessao
  before insert on pacotes_sessao
  for each row execute function set_empresa_id();

create trigger set_empresa_id_pacote_sessao_consumos
  before insert on pacote_sessao_consumos
  for each row execute function set_empresa_id();

create policy "pacotes_sessao: isolado por empresa" on pacotes_sessao for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

create policy "pacote_sessao_consumos: isolado por empresa" on pacote_sessao_consumos for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

-- RPC transacional: vende um pacote (comanda avulsa + item + pacote), nos
-- mesmos moldes de `registrar_pagamento` (0008) — evita inconsistência entre
-- as 3 tabelas se o client fizesse os inserts em sequência separada.
create or replace function vender_pacote_sessao(
  p_paciente_id uuid,
  p_procedimento_id uuid,
  p_sessoes_total integer,
  p_valor numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_procedimento_nome text;
  v_comanda_id uuid;
  v_comanda_item_id uuid;
  v_pacote_id uuid;
begin
  select nome into v_procedimento_nome from procedimentos where id = p_procedimento_id;

  if v_procedimento_nome is null then
    raise exception 'Procedimento não encontrado.';
  end if;

  insert into comandas (paciente_id, total)
  values (p_paciente_id, p_valor)
  returning id into v_comanda_id;

  insert into comanda_itens (comanda_id, procedimento_id, descricao, quantidade, valor_unitario)
  values (
    v_comanda_id,
    p_procedimento_id,
    'Pacote ' || p_sessoes_total || 'x ' || v_procedimento_nome,
    1,
    p_valor
  )
  returning id into v_comanda_item_id;

  insert into pacotes_sessao (paciente_id, procedimento_id, comanda_item_id, sessoes_total)
  values (p_paciente_id, p_procedimento_id, v_comanda_item_id, p_sessoes_total)
  returning id into v_pacote_id;

  return jsonb_build_object(
    'comanda_id', v_comanda_id,
    'pacote_id', v_pacote_id
  );
end;
$$;

grant execute on function vender_pacote_sessao(uuid, uuid, integer, numeric) to authenticated;

-- RPC transacional: abate 1 sessão de um pacote a partir de um atendimento
-- concluído. A constraint `unique (atendimento_id)` em `pacote_sessao_consumos`
-- bloqueia dupla chamada para o mesmo atendimento.
create or replace function abater_sessao_pacote(
  p_pacote_id uuid,
  p_atendimento_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sessoes_utilizadas integer;
begin
  insert into pacote_sessao_consumos (pacote_id, atendimento_id)
  values (p_pacote_id, p_atendimento_id);

  update pacotes_sessao
  set sessoes_utilizadas = sessoes_utilizadas + 1
  where id = p_pacote_id and sessoes_utilizadas < sessoes_total
  returning sessoes_utilizadas into v_sessoes_utilizadas;

  if v_sessoes_utilizadas is null then
    raise exception 'Pacote sem sessões restantes.';
  end if;

  return jsonb_build_object(
    'pacote_id', p_pacote_id,
    'sessoes_utilizadas', v_sessoes_utilizadas
  );
end;
$$;

grant execute on function abater_sessao_pacote(uuid, uuid) to authenticated;
