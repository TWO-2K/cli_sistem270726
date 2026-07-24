-- Bucket privado para fotos antes/depois de atendimento. Dado sensível
-- (LGPD), por isso não é público: acesso só via signed URL, e via RLS
-- restrito ao clinica_id do usuário autenticado, usando a convenção de
-- path `{clinica_id}/{atendimento_id}/{arquivo}`.

insert into storage.buckets (id, name, public)
values ('fotos-atendimento', 'fotos-atendimento', false)
on conflict (id) do nothing;

create policy "fotos_atendimento: select isolado por clinica"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'fotos-atendimento'
    and (storage.foldername(name))[1] = auth_clinica_id()::text
  );

create policy "fotos_atendimento: insert isolado por clinica"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fotos-atendimento'
    and (storage.foldername(name))[1] = auth_clinica_id()::text
  );

create policy "fotos_atendimento: delete isolado por clinica"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fotos-atendimento'
    and (storage.foldername(name))[1] = auth_clinica_id()::text
  );
