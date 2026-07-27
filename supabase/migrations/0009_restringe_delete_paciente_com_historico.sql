-- As FKs de paciente_id foram criadas com `on delete cascade` em
-- 0001_mvp_schema.sql, então excluir um paciente apagava silenciosamente
-- todo o histórico clínico/financeiro vinculado (agendamentos, prontuário,
-- anamnese, atendimentos, evoluções, fotos e comandas). Trocamos para
-- `on delete restrict` (mesmo padrão já usado para usuarios.id em
-- 0006_merge_profissionais_em_usuarios.sql), para que o Postgres bloqueie
-- a exclusão de um paciente que ainda tenha histórico vinculado.

alter table agendamentos
  drop constraint agendamentos_paciente_id_fkey,
  add constraint agendamentos_paciente_id_fkey
    foreign key (paciente_id) references pacientes (id) on delete restrict;

alter table prontuarios
  drop constraint prontuarios_paciente_id_fkey,
  add constraint prontuarios_paciente_id_fkey
    foreign key (paciente_id) references pacientes (id) on delete restrict;

alter table anamneses
  drop constraint anamneses_paciente_id_fkey,
  add constraint anamneses_paciente_id_fkey
    foreign key (paciente_id) references pacientes (id) on delete restrict;

alter table atendimentos
  drop constraint atendimentos_paciente_id_fkey,
  add constraint atendimentos_paciente_id_fkey
    foreign key (paciente_id) references pacientes (id) on delete restrict;

alter table evolucoes
  drop constraint evolucoes_paciente_id_fkey,
  add constraint evolucoes_paciente_id_fkey
    foreign key (paciente_id) references pacientes (id) on delete restrict;

alter table fotos_atendimento
  drop constraint fotos_atendimento_paciente_id_fkey,
  add constraint fotos_atendimento_paciente_id_fkey
    foreign key (paciente_id) references pacientes (id) on delete restrict;

alter table comandas
  drop constraint comandas_paciente_id_fkey,
  add constraint comandas_paciente_id_fkey
    foreign key (paciente_id) references pacientes (id) on delete restrict;
