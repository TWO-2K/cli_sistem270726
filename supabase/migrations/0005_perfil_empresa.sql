-- Perfil da empresa: dados gerais, endereço e horário de funcionamento por dia
-- da semana. horario_funcionamento é um array de 7 posições (0=domingo..6=sábado),
-- cada uma {ativo, inicio, fim} — reflete diretamente nos limites e dias
-- disponíveis para agendamento na Agenda.

alter table clinicas
  add column cnpj text,
  add column endereco text,
  add column email text,
  add column horario_funcionamento jsonb not null default '[
    {"ativo": false, "inicio": "08:00", "fim": "18:00"},
    {"ativo": true,  "inicio": "08:00", "fim": "18:00"},
    {"ativo": true,  "inicio": "08:00", "fim": "18:00"},
    {"ativo": true,  "inicio": "08:00", "fim": "18:00"},
    {"ativo": true,  "inicio": "08:00", "fim": "18:00"},
    {"ativo": true,  "inicio": "08:00", "fim": "18:00"},
    {"ativo": false, "inicio": "08:00", "fim": "18:00"}
  ]'::jsonb;

create policy "clinica: membro pode atualizar a própria clínica"
  on clinicas for update
  using (id = auth_clinica_id())
  with check (id = auth_clinica_id());
