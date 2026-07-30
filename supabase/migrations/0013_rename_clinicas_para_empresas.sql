-- Generaliza o conceito raiz de tenant de "clínica" para "empresa": o schema
-- já suporta múltiplas especialidades (segmento) e o admin gerencia negócios
-- de forma agnóstica, então "clínica" era um nome domain-specific demais para
-- a tabela raiz do multi-tenant. Renomeia tabela, coluna, índices, funções,
-- triggers, constraints e policies. Sem alteração de RLS além do rename:
-- USING/WITH CHECK continuam válidos porque referenciam coluna/função por OID,
-- não por texto — só os corpos de função (texto puro) precisam ser reescritos.

-- 1. Tabela
alter table clinicas rename to empresas;

-- 2. Coluna clinica_id -> empresa_id nas tabelas que ainda existem
alter table usuarios rename column clinica_id to empresa_id;
alter table pacientes rename column clinica_id to empresa_id;
alter table salas rename column clinica_id to empresa_id;
alter table procedimentos rename column clinica_id to empresa_id;
alter table agendamentos rename column clinica_id to empresa_id;
alter table prontuarios rename column clinica_id to empresa_id;
alter table anamneses rename column clinica_id to empresa_id;
alter table atendimentos rename column clinica_id to empresa_id;
alter table evolucoes rename column clinica_id to empresa_id;
alter table fotos_atendimento rename column clinica_id to empresa_id;
alter table comandas rename column clinica_id to empresa_id;
alter table comanda_itens rename column clinica_id to empresa_id;
alter table pagamentos rename column clinica_id to empresa_id;
alter table parcelas rename column clinica_id to empresa_id;

-- 3. Índices (prontuarios nunca teve índice dedicado)
alter index usuarios_clinica_id_idx rename to usuarios_empresa_id_idx;
alter index pacientes_clinica_id_idx rename to pacientes_empresa_id_idx;
alter index salas_clinica_id_idx rename to salas_empresa_id_idx;
alter index procedimentos_clinica_id_idx rename to procedimentos_empresa_id_idx;
alter index agendamentos_clinica_id_idx rename to agendamentos_empresa_id_idx;
alter index anamneses_clinica_id_idx rename to anamneses_empresa_id_idx;
alter index atendimentos_clinica_id_idx rename to atendimentos_empresa_id_idx;
alter index evolucoes_clinica_id_idx rename to evolucoes_empresa_id_idx;
alter index fotos_atendimento_clinica_id_idx rename to fotos_atendimento_empresa_id_idx;
alter index comandas_clinica_id_idx rename to comandas_empresa_id_idx;
alter index comanda_itens_clinica_id_idx rename to comanda_itens_empresa_id_idx;
alter index pagamentos_clinica_id_idx rename to pagamentos_empresa_id_idx;
alter index parcelas_clinica_id_idx rename to parcelas_empresa_id_idx;

-- 4. Funções: renomear e reescrever corpo (texto puro, não se atualiza sozinho)
alter function auth_clinica_id() rename to auth_empresa_id;
create or replace function auth_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from usuarios where id = auth.uid();
$$;

alter function set_clinica_id() rename to set_empresa_id;
create or replace function set_empresa_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.empresa_id := auth_empresa_id();
  return new;
end;
$$;

-- 5. Triggers (mesmas 13 tabelas de negócio; profissionais foi removida em 0006)
alter trigger set_clinica_id_pacientes on pacientes rename to set_empresa_id_pacientes;
alter trigger set_clinica_id_salas on salas rename to set_empresa_id_salas;
alter trigger set_clinica_id_procedimentos on procedimentos rename to set_empresa_id_procedimentos;
alter trigger set_clinica_id_agendamentos on agendamentos rename to set_empresa_id_agendamentos;
alter trigger set_clinica_id_prontuarios on prontuarios rename to set_empresa_id_prontuarios;
alter trigger set_clinica_id_anamneses on anamneses rename to set_empresa_id_anamneses;
alter trigger set_clinica_id_atendimentos on atendimentos rename to set_empresa_id_atendimentos;
alter trigger set_clinica_id_evolucoes on evolucoes rename to set_empresa_id_evolucoes;
alter trigger set_clinica_id_fotos_atendimento on fotos_atendimento rename to set_empresa_id_fotos_atendimento;
alter trigger set_clinica_id_comandas on comandas rename to set_empresa_id_comandas;
alter trigger set_clinica_id_comanda_itens on comanda_itens rename to set_empresa_id_comanda_itens;
alter trigger set_clinica_id_pagamentos on pagamentos rename to set_empresa_id_pagamentos;
alter trigger set_clinica_id_parcelas on parcelas rename to set_empresa_id_parcelas;

-- 6. Constraints
alter table usuarios rename constraint usuarios_super_admin_sem_clinica to usuarios_super_admin_sem_empresa;
alter table empresas rename constraint clinicas_segmento_check to empresas_segmento_check;
alter table empresas rename constraint clinicas_status_check to empresas_status_check;

-- 7. Policies — tabela empresas
alter policy "clinica: membro pode ver a própria clínica" on empresas rename to "empresa: membro pode ver a própria empresa";
alter policy "clinicas: super_admin acesso total" on empresas rename to "empresas: super_admin acesso total";
alter policy "clinica: membro pode atualizar a própria clínica" on empresas rename to "empresa: membro pode atualizar a própria empresa";

-- Policies — usuarios
alter policy "usuarios: apenas da própria clínica" on usuarios rename to "usuarios: apenas da própria empresa";

-- Policies — demais tabelas de negócio ("isolado por clinica" -> "isolado por empresa")
alter policy "pacientes: isolado por clinica" on pacientes rename to "pacientes: isolado por empresa";
alter policy "salas: isolado por clinica" on salas rename to "salas: isolado por empresa";
alter policy "procedimentos: isolado por clinica" on procedimentos rename to "procedimentos: isolado por empresa";
alter policy "agendamentos: isolado por clinica" on agendamentos rename to "agendamentos: isolado por empresa";
alter policy "prontuarios: isolado por clinica" on prontuarios rename to "prontuarios: isolado por empresa";
alter policy "anamneses: isolado por clinica" on anamneses rename to "anamneses: isolado por empresa";
alter policy "atendimentos: isolado por clinica" on atendimentos rename to "atendimentos: isolado por empresa";
alter policy "evolucoes: isolado por clinica" on evolucoes rename to "evolucoes: isolado por empresa";
alter policy "fotos_atendimento: isolado por clinica" on fotos_atendimento rename to "fotos_atendimento: isolado por empresa";
alter policy "comandas: isolado por clinica" on comandas rename to "comandas: isolado por empresa";
alter policy "comanda_itens: isolado por clinica" on comanda_itens rename to "comanda_itens: isolado por empresa";
alter policy "pagamentos: isolado por clinica" on pagamentos rename to "pagamentos: isolado por empresa";
alter policy "parcelas: isolado por clinica" on parcelas rename to "parcelas: isolado por empresa";

-- Policies — storage.objects (bucket fotos-atendimento)
-- alter policy ... rename exige ser dono de storage.objects (supabase_storage_admin),
-- privilégio que o role de migração não tem — recria via drop+create.
drop policy "fotos_atendimento: select isolado por clinica" on storage.objects;
create policy "fotos_atendimento: select isolado por empresa"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'fotos-atendimento'
    and (storage.foldername(name))[1] = auth_empresa_id()::text
  );

drop policy "fotos_atendimento: insert isolado por clinica" on storage.objects;
create policy "fotos_atendimento: insert isolado por empresa"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fotos-atendimento'
    and (storage.foldername(name))[1] = auth_empresa_id()::text
  );

drop policy "fotos_atendimento: delete isolado por clinica" on storage.objects;
create policy "fotos_atendimento: delete isolado por empresa"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fotos-atendimento'
    and (storage.foldername(name))[1] = auth_empresa_id()::text
  );
