alter table atendimentos
  add column anamnese_id uuid references anamneses (id) on delete set null;

create index atendimentos_anamnese_id_idx on atendimentos (anamnese_id);
