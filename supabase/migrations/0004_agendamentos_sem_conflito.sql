-- Impede sobreposição de horários: um profissional não pode ter dois
-- agendamentos no mesmo intervalo, e um paciente não pode ser agendado
-- duas vezes no mesmo intervalo. Agendamentos cancelados/faltosos não contam.
--
-- `periodo` é mantido por trigger (não `generated always as`) porque a soma
-- timestamptz + interval é STABLE, não IMMUTABLE, e por isso não pode ser
-- usada numa expressão de coluna gerada.

create extension if not exists btree_gist;

alter table agendamentos add column periodo tstzrange;

create or replace function agendamentos_set_periodo()
returns trigger
language plpgsql
as $$
begin
  new.periodo := tstzrange(
    new.data_hora,
    new.data_hora + (new.duracao_minutos || ' minutes')::interval,
    '[)'
  );
  return new;
end;
$$;

create trigger agendamentos_set_periodo_trigger
  before insert or update of data_hora, duracao_minutos on agendamentos
  for each row execute function agendamentos_set_periodo();

update agendamentos set periodo = tstzrange(
  data_hora, data_hora + (duracao_minutos || ' minutes')::interval, '[)'
);

alter table agendamentos alter column periodo set not null;

alter table agendamentos
  add constraint agendamentos_profissional_sem_conflito
  exclude using gist (
    profissional_id with =,
    periodo with &&
  ) where (status not in ('cancelado', 'faltou'));

alter table agendamentos
  add constraint agendamentos_paciente_sem_conflito
  exclude using gist (
    paciente_id with =,
    periodo with &&
  ) where (status not in ('cancelado', 'faltou'));
