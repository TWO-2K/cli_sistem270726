-- RPC para marcar uma parcela como paga a partir da aba "Contas a receber".
-- Quando todas as parcelas de um pagamento parcelado ficam pagas, o
-- pagamento em si também passa a 'pago' (hoje ficava 'pendente' para sempre).
-- security invoker: roda com o privilégio do usuário chamador, RLS continua valendo.
create or replace function marcar_parcela_paga(p_parcela_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pagamento_id uuid;
  v_pendentes integer;
begin
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

  return jsonb_build_object('pagamento_id', v_pagamento_id, 'pagamento_quitado', v_pendentes = 0);
end;
$$;

grant execute on function marcar_parcela_paga(uuid) to authenticated;
