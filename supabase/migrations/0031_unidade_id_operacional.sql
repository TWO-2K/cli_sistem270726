-- Fase 5c: vínculo fixo usuário -> unidade (sem seletor na UI, mesmo padrão
-- de auth_empresa_id()/set_empresa_id()) + unidade_id nas tabelas de recurso
-- físico/operação local. Tabelas de catálogo compartilhado entre unidades
-- (pacientes, procedimentos, convenios, produtos, leads, despesas, etc.)
-- não recebem a coluna.
--
-- unidade_id é nullable em todas as tabelas (inclusive usuarios): enquanto
-- nenhuma unidade for criada e nenhum usuário for vinculado, auth_unidade_id()
-- retorna null para todo mundo e a condição
-- `unidade_id = auth_unidade_id() or unidade_id is null or auth_unidade_id() is null`
-- é sempre satisfeita — comportamento idêntico ao anterior à esta migration.
-- Isolamento por unidade só passa a valer de fato depois que unidades forem
-- criadas e usuários vinculados a elas (feature "off by default").

alter table usuarios
  add column unidade_id uuid references unidades (id) on delete set null;
create index usuarios_unidade_id_idx on usuarios (unidade_id);

create or replace function auth_unidade_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select unidade_id from usuarios where id = auth.uid();
$$;

-- Helper para a policy de transição: admin/financeiro da empresa continuam
-- enxergando todas as unidades (visão gerencial), mesmo com unidade_id
-- preenchido nos registros.
create or replace function auth_e_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select perfil = 'admin' from usuarios where id = auth.uid()),
    false
  );
$$;

create or replace function set_unidade_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.unidade_id := auth_unidade_id();
  return new;
end;
$$;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'salas', 'agendamentos', 'atendimentos', 'comandas', 'pagamentos', 'parcelas'
  ]
  loop
    execute format(
      'alter table %1$s add column unidade_id uuid references unidades (id) on delete set null;',
      tabela
    );
    execute format(
      'create index %1$s_unidade_id_idx on %1$s (unidade_id);',
      tabela
    );
    execute format(
      'create trigger set_unidade_id_%1$s
        before insert on %1$s
        for each row execute function set_unidade_id();',
      tabela
    );
    execute format(
      'drop policy "%1$s: isolado por empresa" on %1$s;',
      tabela
    );
    execute format(
      'create policy "%1$s: isolado por empresa" on %1$s for all
        using (
          empresa_id = auth_empresa_id()
          and (
            unidade_id = auth_unidade_id()
            or unidade_id is null
            or auth_unidade_id() is null
            or auth_e_admin()
          )
        )
        with check (
          empresa_id = auth_empresa_id()
          and (
            unidade_id = auth_unidade_id()
            or unidade_id is null
            or auth_unidade_id() is null
            or auth_e_admin()
          )
        );',
      tabela
    );
  end loop;
end $$;
