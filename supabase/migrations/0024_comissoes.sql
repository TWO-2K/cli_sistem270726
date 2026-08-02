-- Fase 4b: comissão de profissional sobre pagamentos.
-- Conceito genérico entre especialidades — nasce em `public`, mesmo padrão
-- de RLS/trigger das demais tabelas. Suporta regra por profissional, por
-- procedimento, ou pela combinação dos dois, com precedência combinação >
-- só profissional > só procedimento > nenhuma (aplicada dentro da RPC
-- `registrar_pagamento` abaixo). `comissoes_lancadas` é o histórico usado
-- pelo DRE (Fase 4c) e pela aba "Comissões" do financeiro.

create table comissao_profissional (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  usuario_id uuid not null references usuarios (id) on delete cascade,
  percentual numeric(5, 2) not null check (percentual >= 0 and percentual <= 100),
  criado_em timestamptz not null default now(),
  unique (empresa_id, usuario_id)
);

create table comissao_procedimento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  procedimento_id uuid not null references procedimentos (id) on delete cascade,
  percentual numeric(5, 2) not null check (percentual >= 0 and percentual <= 100),
  criado_em timestamptz not null default now(),
  unique (empresa_id, procedimento_id)
);

create table comissao_profissional_procedimento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  usuario_id uuid not null references usuarios (id) on delete cascade,
  procedimento_id uuid not null references procedimentos (id) on delete cascade,
  percentual numeric(5, 2) not null check (percentual >= 0 and percentual <= 100),
  criado_em timestamptz not null default now(),
  unique (empresa_id, usuario_id, procedimento_id)
);

create table comissoes_lancadas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  pagamento_id uuid not null references pagamentos (id) on delete cascade,
  usuario_id uuid not null references usuarios (id) on delete cascade,
  comanda_id uuid not null references comandas (id) on delete cascade,
  percentual_aplicado numeric(5, 2) not null,
  valor_base numeric(10, 2) not null,
  valor_comissao numeric(10, 2) not null,
  status status_pagamento not null default 'pendente',
  criado_em timestamptz not null default now(),
  unique (pagamento_id)
);

create index comissao_profissional_empresa_id_idx on comissao_profissional (empresa_id);
create index comissao_procedimento_empresa_id_idx on comissao_procedimento (empresa_id);
create index comissao_profissional_procedimento_empresa_id_idx on comissao_profissional_procedimento (empresa_id);
create index comissoes_lancadas_empresa_id_idx on comissoes_lancadas (empresa_id);
create index comissoes_lancadas_usuario_id_idx on comissoes_lancadas (usuario_id);

alter table comissao_profissional enable row level security;
alter table comissao_procedimento enable row level security;
alter table comissao_profissional_procedimento enable row level security;
alter table comissoes_lancadas enable row level security;

create trigger set_empresa_id_comissao_profissional
  before insert on comissao_profissional
  for each row execute function set_empresa_id();

create trigger set_empresa_id_comissao_procedimento
  before insert on comissao_procedimento
  for each row execute function set_empresa_id();

create trigger set_empresa_id_comissao_profissional_procedimento
  before insert on comissao_profissional_procedimento
  for each row execute function set_empresa_id();

create trigger set_empresa_id_comissoes_lancadas
  before insert on comissoes_lancadas
  for each row execute function set_empresa_id();

create policy "comissao_profissional: isolado por empresa" on comissao_profissional for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

create policy "comissao_procedimento: isolado por empresa" on comissao_procedimento for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

create policy "comissao_profissional_procedimento: isolado por empresa" on comissao_profissional_procedimento for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

create policy "comissoes_lancadas: isolado por empresa" on comissoes_lancadas for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

-- Estende registrar_pagamento (0008): mesma assinatura e retorno jsonb, sem
-- quebrar registrar-pagamento-dialog.tsx. Ao fechar a comanda (cobre_total),
-- calcula comissão item a item (precedência combinação > profissional >
-- procedimento) e lança 1 linha consolidada em comissoes_lancadas. Sem
-- atendimento_id vinculado ou sem regra aplicável, não lança nada.
create or replace function registrar_pagamento(
  p_comanda_id uuid,
  p_forma_pagamento text,
  p_valor numeric,
  p_num_parcelas integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pagamento_id uuid;
  v_total numeric(10, 2);
  v_cobre_total boolean;
  v_valor_parcela numeric(10, 2);
  v_ultima_parcela numeric(10, 2);
  v_vencimento date;
  i integer;
  v_usuario_id uuid;
  v_item record;
  v_item_total numeric(10, 2);
  v_percentual numeric(5, 2);
  v_valor_base numeric(10, 2) := 0;
  v_valor_comissao numeric(10, 2) := 0;
begin
  select total into v_total from comandas where id = p_comanda_id;

  if v_total is null then
    raise exception 'Comanda não encontrada.';
  end if;

  insert into pagamentos (comanda_id, forma_pagamento, valor, status)
  values (
    p_comanda_id,
    p_forma_pagamento,
    p_valor,
    case when p_num_parcelas = 1 then 'pago' else 'pendente' end::status_pagamento
  )
  returning id into v_pagamento_id;

  if p_num_parcelas > 1 then
    v_valor_parcela := floor((p_valor / p_num_parcelas) * 100) / 100;
    v_ultima_parcela := p_valor - v_valor_parcela * (p_num_parcelas - 1);

    for i in 0 .. p_num_parcelas - 1 loop
      v_vencimento := (current_date + ((i + 1) || ' months')::interval)::date;
      insert into parcelas (pagamento_id, vencimento, valor, status)
      values (
        v_pagamento_id,
        v_vencimento,
        case when i = p_num_parcelas - 1 then v_ultima_parcela else v_valor_parcela end,
        'pendente'
      );
    end loop;
  end if;

  v_cobre_total := p_valor >= v_total - 0.01;

  if v_cobre_total then
    update comandas set status = 'fechada' where id = p_comanda_id;

    select a.usuario_id into v_usuario_id
    from comandas c
    join atendimentos a on a.id = c.atendimento_id
    where c.id = p_comanda_id;

    if v_usuario_id is not null then
      for v_item in
        select procedimento_id, quantidade, valor_unitario
        from comanda_itens
        where comanda_id = p_comanda_id
      loop
        v_item_total := v_item.quantidade * v_item.valor_unitario;

        select percentual into v_percentual
        from comissao_profissional_procedimento
        where usuario_id = v_usuario_id and procedimento_id = v_item.procedimento_id;

        if v_percentual is null then
          select percentual into v_percentual
          from comissao_profissional
          where usuario_id = v_usuario_id;
        end if;

        if v_percentual is null then
          select percentual into v_percentual
          from comissao_procedimento
          where procedimento_id = v_item.procedimento_id;
        end if;

        if v_percentual is not null then
          v_valor_base := v_valor_base + v_item_total;
          v_valor_comissao := v_valor_comissao + (v_item_total * v_percentual / 100);
        end if;
      end loop;

      if v_valor_comissao > 0 then
        insert into comissoes_lancadas (
          pagamento_id, usuario_id, comanda_id,
          percentual_aplicado, valor_base, valor_comissao
        )
        values (
          v_pagamento_id, v_usuario_id, p_comanda_id,
          round(v_valor_comissao / v_valor_base * 100, 2), v_valor_base, v_valor_comissao
        )
        on conflict (pagamento_id) do nothing;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'pagamento_id', v_pagamento_id,
    'cobre_total', v_cobre_total
  );
end;
$$;

grant execute on function registrar_pagamento(uuid, text, numeric, integer) to authenticated;
