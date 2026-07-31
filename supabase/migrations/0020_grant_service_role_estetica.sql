-- A migration 0015 concedeu acesso ao schema/tabelas "estetica" só para
-- "authenticated". O client admin (service role), usado pela rota de reset
-- de dados de teste, opera com o role "service_role" no Postgres — bypassa
-- RLS, mas ainda depende de GRANT explícito de schema/tabela, que faltava.
grant usage on schema estetica to service_role;
grant select, insert, update, delete on estetica.anamnese_estetica to service_role;
grant select, insert, update, delete on estetica.anamnese_estetica_contraindicacao to service_role;
