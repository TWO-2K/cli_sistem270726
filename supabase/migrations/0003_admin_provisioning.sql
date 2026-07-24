-- Provisionamento por administrador: não existe mais auto-cadastro público.
-- - super_admin (dono do sistema) cria clínicas e o usuário admin de cada uma.
-- - admin de uma clínica cria os demais usuários (recepção, profissional,
--   financeiro) dessa clínica.
-- Toda criação de usuário acontece no servidor com a service role key
-- (bypassa RLS), então as policies abaixo cobrem apenas leitura/atualização.

alter table usuarios alter column clinica_id drop not null;
alter table usuarios
  add column must_change_password boolean not null default true;

-- super_admin não pertence a nenhuma clínica; os demais perfis, sim.
alter table usuarios
  add constraint usuarios_super_admin_sem_clinica check (
    (perfil = 'super_admin') = (clinica_id is null)
  );

-- Função auxiliar: usuário autenticado atual é super_admin?
create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios where id = auth.uid() and perfil = 'super_admin'
  );
$$;

-- Remove as policies de auto-cadastro do MVP anterior: criação de clínica e
-- de usuário passa a acontecer só via service role, no servidor.
drop policy if exists "clinica: usuário autenticado pode criar" on clinicas;
drop policy if exists "usuarios: usuário pode criar o próprio vínculo" on usuarios;

-- super_admin enxerga e gerencia todas as clínicas e usuários.
create policy "clinicas: super_admin acesso total"
  on clinicas for all
  using (is_super_admin())
  with check (is_super_admin());

create policy "usuarios: super_admin acesso total"
  on usuarios for all
  using (is_super_admin())
  with check (is_super_admin());
