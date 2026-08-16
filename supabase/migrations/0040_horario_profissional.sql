-- Disponibilidade própria por profissional: hoje só existe o horário de
-- funcionamento da clínica inteira (empresas.horario_funcionamento, 0005).
-- Coluna nova nullable — null = herda o horário da clínica (fallback
-- dinâmico, resolvido no client, não copiado no insert), preenchida só
-- quando o profissional tem um horário próprio diferente. Mesmo shape de
-- `empresas.horario_funcionamento`: array de 7 posições (domingo=0…
-- sábado=6), cada uma { ativo, inicio, fim }.

alter table usuarios add column horario_funcionamento jsonb;
