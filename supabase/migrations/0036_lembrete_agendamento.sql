-- Fase 2b: lembrete automático de agendamento por e-mail.
-- pg_cron (não Vercel Cron, decisão já registrada no roadmap) dispara a cada
-- 15min uma chamada HTTP (pg_net) para a Edge Function
-- `enviar-lembretes-agendamento`, que varre agendamentos nas próximas ~24h
-- e envia o lembrete via Resend.
--
-- A chamada HTTP precisa de autenticação (Authorization: Bearer
-- <service_role_key>) para a Edge Function aceitar a requisição. Esse valor
-- é sensível e não pode ir hardcoded numa migration versionada em git —
-- fica no Vault do Supabase (`vault.create_secret`), configurado uma única
-- vez fora do controle de versão via `definir_secret_cron_lembretes`,
-- função restrita a `service_role`.

alter table agendamentos
  add column lembrete_enviado_em timestamptz;

create index agendamentos_lembrete_pendente_idx
  on agendamentos (data_hora)
  where lembrete_enviado_em is null;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create or replace function definir_secret_cron_lembretes(p_service_role_key text)
returns void
language sql
security definer
set search_path = public, vault
as $$
  select vault.create_secret(
    p_service_role_key,
    'edge_function_service_role_key',
    'Service role key usado pelo pg_cron para chamar Edge Functions autenticadas'
  );
$$;

revoke execute on function definir_secret_cron_lembretes(text) from public;
-- Só chamável com a service role key (bypassa RLS/grants) — configuração
-- administrativa única, feita via script fora do app.

select cron.schedule(
  'enviar-lembretes-agendamento',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://jkyfjlpuvhgzstcdyhar.supabase.co/functions/v1/enviar-lembretes-agendamento',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'edge_function_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
