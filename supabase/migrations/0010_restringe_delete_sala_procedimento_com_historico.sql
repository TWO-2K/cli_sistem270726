-- Mesmo problema de 0009, agora em `salas` e `procedimentos`: as FKs eram
-- `on delete set null` em 0001_mvp_schema.sql, então excluir uma sala ou
-- procedimento já usado em agendamentos/atendimentos/itens de comanda
-- simplesmente zerava a referência, apagando silenciosamente o histórico de
-- qual sala/procedimento foi usado. Trocamos para `on delete restrict`
-- (mesmo padrão de 0006 e 0009), para que o Postgres bloqueie a exclusão
-- enquanto houver histórico vinculado.

alter table agendamentos
  drop constraint agendamentos_sala_id_fkey,
  add constraint agendamentos_sala_id_fkey
    foreign key (sala_id) references salas (id) on delete restrict;

alter table agendamentos
  drop constraint agendamentos_procedimento_id_fkey,
  add constraint agendamentos_procedimento_id_fkey
    foreign key (procedimento_id) references procedimentos (id) on delete restrict;

alter table atendimentos
  drop constraint atendimentos_procedimento_id_fkey,
  add constraint atendimentos_procedimento_id_fkey
    foreign key (procedimento_id) references procedimentos (id) on delete restrict;

alter table comanda_itens
  drop constraint comanda_itens_procedimento_id_fkey,
  add constraint comanda_itens_procedimento_id_fkey
    foreign key (procedimento_id) references procedimentos (id) on delete restrict;
