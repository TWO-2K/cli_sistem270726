-- Fase 6c: auditoria de ações sensíveis (rodada 1 — pagamentos/parcelas).
-- registrar_pagamento (0008) e marcar_parcela_paga (0014) já são o funil
-- único de escrita para essas ações, com contexto de negócio rico demais
-- para um trigger genérico capturar (ex. "quitou a comanda?") — o insert de
-- auditoria entra explícito dentro da própria função, security invoker
-- inalterado (o insert em audit_log roda como o usuário chamador, já
-- autorizado pela policy de insert de 0032).

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
  v_empresa_id uuid;
  v_total numeric(10, 2);
  v_cobre_total boolean;
  v_valor_parcela numeric(10, 2);
  v_ultima_parcela numeric(10, 2);
  v_vencimento date;
  v_usuario_nome text;
  i integer;
begin
  select total, empresa_id into v_total, v_empresa_id
  from comandas where id = p_comanda_id;

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
  end if;

  select nome into v_usuario_nome from usuarios where id = auth.uid();
  insert into audit_log (
    empresa_id, usuario_id, usuario_nome, acao, entidade, entidade_id, dados_depois
  )
  values (
    v_empresa_id,
    auth.uid(),
    coalesce(v_usuario_nome, 'desconhecido'),
    'pagamento.registrado',
    'pagamentos',
    v_pagamento_id,
    jsonb_build_object(
      'comanda_id', p_comanda_id,
      'forma_pagamento', p_forma_pagamento,
      'valor', p_valor,
      'num_parcelas', p_num_parcelas,
      'cobre_total', v_cobre_total
    )
  );

  return jsonb_build_object(
    'pagamento_id', v_pagamento_id,
    'cobre_total', v_cobre_total
  );
end;
$$;

grant execute on function registrar_pagamento(uuid, text, numeric, integer) to authenticated;

create or replace function marcar_parcela_paga(p_parcela_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pagamento_id uuid;
  v_pendentes integer;
  v_empresa_id uuid;
  v_dados_antes jsonb;
  v_usuario_nome text;
begin
  select empresa_id, to_jsonb(parcelas) into v_empresa_id, v_dados_antes
  from parcelas where id = p_parcela_id;

  update parcelas set status = 'pago' where id = p_parcela_id
  returning pagamento_id into v_pagamento_id;

  if v_pagamento_id is null then
    raise exception 'Parcela não encontrada.';
  end if;

  select count(*) into v_pendentes
  from parcelas
  where pagamento_id = v_pagamento_id and status <> 'pago';

  if v_pendentes = 0 then
    update pagamentos set status = 'pago' where id = v_pagamento_id;
  end if;

  select nome into v_usuario_nome from usuarios where id = auth.uid();
  insert into audit_log (
    empresa_id, usuario_id, usuario_nome, acao, entidade, entidade_id,
    dados_antes, dados_depois
  )
  values (
    v_empresa_id,
    auth.uid(),
    coalesce(v_usuario_nome, 'desconhecido'),
    'parcela.paga',
    'parcelas',
    p_parcela_id,
    v_dados_antes,
    jsonb_build_object('status', 'pago', 'pagamento_quitado', v_pendentes = 0)
  );

  return jsonb_build_object('pagamento_id', v_pagamento_id, 'pagamento_quitado', v_pendentes = 0);
end;
$$;

grant execute on function marcar_parcela_paga(uuid) to authenticated;
