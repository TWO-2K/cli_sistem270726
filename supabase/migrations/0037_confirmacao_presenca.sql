-- Fase 2c: confirmação de presença via link público (depende de 2a/2b —
-- reusa o mesmo e-mail de lembrete pra incluir o link).
--
-- Token opaco por agendamento (não é o próprio `id`, pra não expor o uuid
-- interno em URL pública nem permitir adivinhar outros agendamentos a
-- partir de um id sequencial-like). Sem RLS nova: a rota pública que valida
-- o token roda sem sessão de usuário (o paciente não tem login), então usa
-- o client de service role — mesmo padrão já usado nas rotas de
-- provisionamento (`api/usuarios/route.ts`).

alter table agendamentos
  add column token_confirmacao uuid not null default gen_random_uuid();

create unique index agendamentos_token_confirmacao_idx
  on agendamentos (token_confirmacao);
