-- Diagnóstico + correção: a RPC aceitar_oferta_fila_espera (0038) deveria
-- estar bloqueada para anon/authenticated (só service_role pode chamar,
-- via Edge Function), mas testes mostraram que a chamada com a anon key
-- ainda executa a função. Revoga de novo, de forma mais explícita, e expõe
-- uma função de diagnóstico temporária (service_role-only) pra confirmar.

revoke all on function aceitar_oferta_fila_espera(uuid) from public, anon, authenticated;
grant execute on function aceitar_oferta_fila_espera(uuid) to service_role;

create or replace function diagnostico_grants_fila_espera()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'anon_pode_executar', has_function_privilege('anon', 'aceitar_oferta_fila_espera(uuid)', 'EXECUTE'),
    'authenticated_pode_executar', has_function_privilege('authenticated', 'aceitar_oferta_fila_espera(uuid)', 'EXECUTE'),
    'service_role_pode_executar', has_function_privilege('service_role', 'aceitar_oferta_fila_espera(uuid)', 'EXECUTE')
  );
$$;

revoke execute on function diagnostico_grants_fila_espera() from public, anon, authenticated;
grant execute on function diagnostico_grants_fila_espera() to service_role;
