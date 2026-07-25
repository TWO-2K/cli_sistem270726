-- RPC transacional para registrar pagamento: substitui a sequência de
-- inserts separados (pagamentos -> parcelas -> update comandas) feita pelo
-- client, que deixava dado inconsistente se uma etapa falhasse no meio.
-- security invoker: roda com o privilégio do usuário chamador, então as
-- políticas de RLS e o trigger set_clinica_id continuam valendo normalmente.
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
  end if;

  return jsonb_build_object(
    'pagamento_id', v_pagamento_id,
    'cobre_total', v_cobre_total
  );
end;
$$;

grant execute on function registrar_pagamento(uuid, text, numeric, integer) to authenticated;
