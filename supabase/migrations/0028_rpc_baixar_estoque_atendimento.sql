-- Fase 5a: RPC de baixa automática de estoque ao concluir atendimento.
-- `security invoker` (não `definer`): é operação de negócio comum sujeita à
-- RLS de `produtos`, mesmo espírito de `registrar_pagamento` (0008) — não
-- uma operação privilegiada como `auth_empresa_id`/`set_empresa_id`. Chamada
-- pelo client em `concluir-atendimento-dialog.tsx` logo após o insert de
-- `comanda_itens`. Sem `raise exception` para estoque insuficiente: estoque
-- negativo é aceitável (insumo faltou mas o atendimento aconteceu); o alerta
-- de estoque baixo na tela de Estoque já cobre a sinalização.

create or replace function baixar_estoque_procedimento(
  p_procedimento_id uuid,
  p_atendimento_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_produtos_baixados jsonb;
begin
  with baixas as (
    update produtos p
    set estoque_atual = p.estoque_atual - pp.quantidade_consumida
    from produto_procedimento pp
    where pp.procedimento_id = p_procedimento_id
      and pp.produto_id = p.id
      and pp.empresa_id = auth_empresa_id()
    returning p.id, p.nome, p.estoque_atual, p.estoque_minimo
  )
  select jsonb_agg(to_jsonb(baixas)) into v_produtos_baixados from baixas;

  return jsonb_build_object(
    'atendimento_id', p_atendimento_id,
    'produtos_baixados', coalesce(v_produtos_baixados, '[]'::jsonb)
  );
end;
$$;

grant execute on function baixar_estoque_procedimento(uuid, uuid) to authenticated;
