-- Fase 2d: lista de espera / reagendamento automático.
-- Diferente de 2b (gatilho é o tempo passando, via pg_cron), o gatilho aqui
-- é um evento: cancelamento de agendamento. Um trigger AFTER UPDATE detecta
-- a mudança de status e chama a Edge Function `notificar-fila-espera` via
-- pg_net, reusando o secret já guardado no Vault em 0036
-- (`edge_function_service_role_key`).

create table lista_espera (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  paciente_id uuid not null references pacientes (id) on delete cascade,
  profissional_id uuid references usuarios (id) on delete set null,
  procedimento_id uuid references procedimentos (id) on delete set null,
  disponibilidade_inicio date not null,
  disponibilidade_fim date not null,
  periodo_dia text not null default 'qualquer'
    check (periodo_dia in ('manha', 'tarde', 'noite', 'qualquer')),
  observacoes text,
  status text not null default 'aguardando'
    check (status in ('aguardando', 'convertido', 'cancelado')),
  oferta_agendamento_id uuid references agendamentos (id) on delete set null,
  oferta_token uuid,
  oferta_expira_em timestamptz,
  agendamento_id uuid references agendamentos (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index lista_espera_empresa_id_idx on lista_espera (empresa_id);
create index lista_espera_status_idx on lista_espera (status);
create index lista_espera_oferta_token_idx on lista_espera (oferta_token);

alter table lista_espera enable row level security;

create trigger set_empresa_id_lista_espera
  before insert on lista_espera
  for each row execute function set_empresa_id();

create policy "lista_espera: isolado por empresa" on lista_espera for all
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

-- Fallback controlado pra empresa_id quando não há sessão de usuário (o
-- fluxo público de aceitar oferta, abaixo, roda sem paciente autenticado).
-- coalesce prioriza auth.uid() sempre que existir — nenhum fluxo autenticado
-- muda de comportamento. Só uma função security definer de confiança
-- (aceitar_oferta_fila_espera) seta essa GUC, e só localmente à transação.
create or replace function auth_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select empresa_id from usuarios where id = auth.uid()),
    nullif(current_setting('app.empresa_id_override', true), '')::uuid
  );
$$;

create or replace function notificar_fila_espera_cancelamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelado' and old.status is distinct from new.status then
    perform net.http_post(
      url := 'https://jkyfjlpuvhgzstcdyhar.supabase.co/functions/v1/notificar-fila-espera',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'edge_function_service_role_key'
        )
      ),
      body := jsonb_build_object('agendamento_id', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger notificar_fila_espera_cancelamento_trigger
  after update on agendamentos
  for each row execute function notificar_fila_espera_cancelamento();

-- security definer, restrita a service_role: o único caller autorizado é a
-- Edge Function `aceitar-oferta-fila-espera` (chamada com a service role
-- key). Nunca exposta a anon/authenticated via supabase.rpc() do browser.
create or replace function aceitar_oferta_fila_espera(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila lista_espera%rowtype;
  v_slot agendamentos%rowtype;
  v_novo_id uuid;
begin
  select * into v_fila from lista_espera where oferta_token = p_token;

  if v_fila.id is null then
    raise exception 'Oferta não encontrada.';
  end if;

  if v_fila.status <> 'aguardando' then
    raise exception 'Esta oferta não está mais disponível.';
  end if;

  if v_fila.oferta_expira_em is null or v_fila.oferta_expira_em < now() then
    raise exception 'Esta oferta expirou.';
  end if;

  select * into v_slot from agendamentos where id = v_fila.oferta_agendamento_id;

  if v_slot.id is null then
    raise exception 'Horário de referência não encontrado.';
  end if;

  perform set_config('app.empresa_id_override', v_fila.empresa_id::text, true);

  insert into agendamentos (
    paciente_id, usuario_id, sala_id, procedimento_id, data_hora,
    duracao_minutos, status
  )
  values (
    v_fila.paciente_id, v_slot.usuario_id, v_slot.sala_id, v_slot.procedimento_id,
    v_slot.data_hora, v_slot.duracao_minutos, 'agendado'
  )
  returning id into v_novo_id;

  update lista_espera
  set status = 'convertido', agendamento_id = v_novo_id, atualizado_em = now()
  where id = v_fila.id;

  return jsonb_build_object('agendamento_id', v_novo_id);
end;
$$;

revoke execute on function aceitar_oferta_fila_espera(uuid) from public;
grant execute on function aceitar_oferta_fila_espera(uuid) to service_role;
