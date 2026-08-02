-- Fase 4b.1 (fixup): fechar_comissoes_mes devolvia o erro cru da constraint
-- unique(empresa_id, usuario_id, competencia) quando havia lançamentos
-- pendentes novos para uma competência já fechada anteriormente (ex.: um
-- pagamento entrou depois do primeiro fechamento do mês). Captura esse caso
-- e devolve uma mensagem que explica o que aconteceu, em vez do texto de
-- erro do Postgres para a constraint.
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
  v_nome text;
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

  begin
    insert into comissoes_repasses (usuario_id, competencia, valor_total, status)
    values (p_usuario_id, v_competencia, v_total, 'pendente')
    returning id into v_repasse_id;
  exception when unique_violation then
    select nome into v_nome from usuarios where id = p_usuario_id;
    raise exception 'Já existe um repasse fechado para % em %. Novos lançamentos pendentes deste mês só entram no fechamento do próximo mês.',
      coalesce(v_nome, 'este profissional'),
      to_char(v_competencia, 'MM/YYYY');
  end;

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
