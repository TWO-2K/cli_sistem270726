-- Fase 6c: auditoria de ações sensíveis (rodada 1 — exclusões).
-- Tabela genérica public.audit_log: trilha imutável (sem update/delete via
-- RLS) de quem fez o quê, reaproveitável por qualquer app de especialidade
-- futura sem mudança de schema — só novos pontos de instrumentação.
--
-- Exclusões (pacientes/procedimentos/salas) passam por delete direto do
-- client (sem RPC), então um trigger genérico AFTER DELETE (mesmo molde
-- array-driven de set_empresa_id()/set_unidade_id()) é o encaixe natural.
-- O trigger só dispara quando o delete realmente commita — quando
-- 0009/0010 bloqueia com 23503 (histórico vinculado), nada foi excluído e
-- não há o que auditar.
--
-- usuarios fica fora: não existe delete de usuário hoje, só toggle de
-- `ativo` (usuarios-tab.tsx) — nada a instrumentar.

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  usuario_id uuid references usuarios (id) on delete set null,
  usuario_nome text not null,
  acao text not null,
  entidade text not null,
  entidade_id uuid,
  dados_antes jsonb,
  dados_depois jsonb,
  criado_em timestamptz not null default now()
);

create index audit_log_empresa_id_criado_em_idx on audit_log (empresa_id, criado_em desc);
create index audit_log_entidade_idx on audit_log (entidade, entidade_id);

alter table audit_log enable row level security;

-- Insert liberado para qualquer usuário autenticado da própria empresa —
-- a ação auditada pode ser de recepção/financeiro, não só admin.
create policy "audit_log: insere na propria empresa"
  on audit_log for insert
  with check (empresa_id = auth_empresa_id());

-- Select restrito a admin, reaproveitando auth_e_admin() (0031).
create policy "audit_log: admin le da propria empresa"
  on audit_log for select
  using (empresa_id = auth_empresa_id() and auth_e_admin());

-- Sem policy de update/delete: trilha de auditoria imutável, nem admin
-- edita/apaga pelo app.

create or replace function registrar_auditoria_exclusao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_nome text;
begin
  select nome into v_usuario_nome from usuarios where id = auth.uid();
  insert into audit_log (
    empresa_id, usuario_id, usuario_nome, acao, entidade, entidade_id, dados_antes
  )
  values (
    old.empresa_id,
    auth.uid(),
    coalesce(v_usuario_nome, 'desconhecido'),
    format('%s.excluido', TG_TABLE_NAME),
    TG_TABLE_NAME,
    old.id,
    to_jsonb(old)
  );
  return old;
end;
$$;

do $$
declare
  tabela text;
begin
  foreach tabela in array array['pacientes', 'procedimentos', 'salas']
  loop
    execute format(
      'create trigger registrar_auditoria_exclusao_%1$s
        after delete on %1$s
        for each row execute function registrar_auditoria_exclusao();',
      tabela
    );
  end loop;
end $$;
