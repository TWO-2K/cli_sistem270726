-- Mescla `profissionais` em `usuarios`: profissional deixa de ser uma
-- entidade própria e passa a ser um usuário com `atende = true`. Elimina o
-- cadastro duplicado (mesma pessoa em duas tabelas) já que, na prática, todo
-- profissional que atende também precisa logar no sistema.

alter table usuarios
  add column especialidade text,
  add column atende boolean not null default false,
  add column ativo boolean not null default true;

-- Dados de teste pré-lançamento: os `profissionais` existentes não têm
-- vínculo de login (não existe `usuarios` correspondente), então os
-- agendamentos/atendimentos de teste que os referenciam são descartados
-- junto com a tabela. Não há dados reais de clínica em produção ainda.
truncate table agendamentos, atendimentos cascade;

drop table profissionais cascade;

alter table agendamentos
  rename column profissional_id to usuario_id;
alter table agendamentos
  add constraint agendamentos_usuario_id_fkey
  foreign key (usuario_id) references usuarios (id) on delete restrict;

alter table atendimentos
  rename column profissional_id to usuario_id;
alter table atendimentos
  add constraint atendimentos_usuario_id_fkey
  foreign key (usuario_id) references usuarios (id) on delete restrict;

-- Renomear coluna atualiza automaticamente o índice e a exclusion
-- constraint que a referenciam; só os nomes precisam de ajuste para
-- continuarem legíveis.
alter index agendamentos_profissional_data_idx
  rename to agendamentos_usuario_data_idx;
alter table agendamentos
  rename constraint agendamentos_profissional_sem_conflito
  to agendamentos_usuario_sem_conflito;
