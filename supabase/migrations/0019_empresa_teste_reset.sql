-- Ambiente de teste: empresas marcadas como teste podem ter seus dados
-- operacionais zerados via admin, sem risco de apagar dados de uma empresa
-- real por engano (a rota de reset valida is_teste = true no servidor).
alter table empresas
  add column is_teste boolean not null default false;
