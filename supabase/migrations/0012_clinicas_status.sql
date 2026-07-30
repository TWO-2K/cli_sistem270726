-- Suspensão de clínica: super_admin pode bloquear o acesso de uma clínica
-- sem apagar seus dados (ex.: inadimplência, encerramento temporário).
alter table clinicas
  add column status text not null default 'ativa',
  add constraint clinicas_status_check check (status in ('ativa', 'suspensa'));
