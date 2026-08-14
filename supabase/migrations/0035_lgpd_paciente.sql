-- Fase 6d: LGPD — exportação e anonimização de dados do paciente.
-- Depende de 6c (audit_log) para registrar quem solicitou/executou a ação.
--
-- Exportação: RPC que agrega, num único jsonb, todo o histórico clínico e
-- financeiro do paciente (prontuário/anamnese, agendamentos, atendimentos,
-- evoluções, fotos, comandas/pagamentos/parcelas, pacotes de sessão, planos
-- de tratamento). Sem tabela nova — é só leitura agregada.
--
-- Anonimização: em vez de excluir linhas (o que já é bloqueado por 0009 e
-- destruiria histórico financeiro que a legislação fiscal exige manter),
-- a rotina remove os dados pessoais identificáveis (nome, telefone, email,
-- endereço, data de nascimento, texto livre de anamnese/evolução) mantendo
-- os registros clínicos/financeiros com os valores e datas intactos, sem
-- vínculo a uma pessoa identificável. Fotos de atendimento (a informação
-- mais sensível e menos essencial pra guarda fiscal) são removidas do
-- Storage e a linha, apagada.

create or replace function exportar_dados_paciente(p_paciente_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_resultado jsonb;
  v_usuario_nome text;
begin
  select nome into v_usuario_nome from usuarios where id = auth.uid();

  select jsonb_build_object(
    'paciente', to_jsonb(p),
    'anamneses', coalesce((
      select jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'estetica', to_jsonb(ae),
        'contraindicacoes', (
          select coalesce(jsonb_agg(pr.nome), '[]'::jsonb)
          from estetica.anamnese_estetica_contraindicacao aec
          join procedimentos pr on pr.id = aec.procedimento_id
          where aec.anamnese_id = a.id
        )
      ))
      from anamneses a
      left join estetica.anamnese_estetica ae on ae.anamnese_id = a.id
      where a.paciente_id = p.id
    ), '[]'::jsonb),
    'agendamentos', coalesce((
      select jsonb_agg(to_jsonb(ag)) from agendamentos ag where ag.paciente_id = p.id
    ), '[]'::jsonb),
    'atendimentos', coalesce((
      select jsonb_agg(to_jsonb(at)) from atendimentos at where at.paciente_id = p.id
    ), '[]'::jsonb),
    'evolucoes', coalesce((
      select jsonb_agg(to_jsonb(ev)) from evolucoes ev where ev.paciente_id = p.id
    ), '[]'::jsonb),
    'fotos_atendimento', coalesce((
      select jsonb_agg(to_jsonb(fo)) from fotos_atendimento fo where fo.paciente_id = p.id
    ), '[]'::jsonb),
    'comandas', coalesce((
      select jsonb_agg(to_jsonb(c) || jsonb_build_object(
        'itens', (select coalesce(jsonb_agg(to_jsonb(ci)), '[]'::jsonb)
                  from comanda_itens ci where ci.comanda_id = c.id),
        'pagamentos', (select coalesce(jsonb_agg(to_jsonb(pg) || jsonb_build_object(
                          'parcelas', (select coalesce(jsonb_agg(to_jsonb(pa)), '[]'::jsonb)
                                       from parcelas pa where pa.pagamento_id = pg.id)
                        )), '[]'::jsonb)
                       from pagamentos pg where pg.comanda_id = c.id)
      ))
      from comandas c where c.paciente_id = p.id
    ), '[]'::jsonb),
    'pacotes_sessao', coalesce((
      select jsonb_agg(to_jsonb(ps)) from pacotes_sessao ps where ps.paciente_id = p.id
    ), '[]'::jsonb),
    'planos_tratamento', coalesce((
      select jsonb_agg(to_jsonb(pt) || jsonb_build_object(
        'etapas', (select coalesce(jsonb_agg(to_jsonb(pte)), '[]'::jsonb)
                   from plano_tratamento_etapas pte where pte.plano_id = pt.id)
      ))
      from planos_tratamento pt where pt.paciente_id = p.id
    ), '[]'::jsonb)
  )
  into v_resultado
  from pacientes p
  where p.id = p_paciente_id
    and p.empresa_id = auth_empresa_id();

  if v_resultado is null then
    raise exception 'Paciente não encontrado.';
  end if;

  insert into audit_log (empresa_id, usuario_id, usuario_nome, acao, entidade, entidade_id)
  values (auth_empresa_id(), auth.uid(), coalesce(v_usuario_nome, 'desconhecido'),
          'paciente.dados_exportados', 'pacientes', p_paciente_id);

  return v_resultado;
end;
$$;

create or replace function anonimizar_paciente(p_paciente_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_usuario_nome text;
  v_dados_antes jsonb;
begin
  if not auth_e_admin() then
    raise exception 'Apenas administradores podem anonimizar dados de paciente.';
  end if;

  select to_jsonb(p) into v_dados_antes
  from pacientes p
  where p.id = p_paciente_id and p.empresa_id = auth_empresa_id();

  if v_dados_antes is null then
    raise exception 'Paciente não encontrado.';
  end if;

  select nome into v_usuario_nome from usuarios where id = auth.uid();

  update pacientes set
    nome = 'Paciente anonimizado',
    telefone = null,
    email = null,
    endereco = null,
    data_nascimento = null
  where id = p_paciente_id and empresa_id = auth_empresa_id();

  update anamneses set respostas = '{}'::jsonb
  where paciente_id = p_paciente_id and empresa_id = auth_empresa_id();

  update evolucoes set texto = '[dados removidos a pedido do titular]'
  where paciente_id = p_paciente_id and empresa_id = auth_empresa_id();

  delete from fotos_atendimento
  where paciente_id = p_paciente_id and empresa_id = auth_empresa_id();

  insert into audit_log (
    empresa_id, usuario_id, usuario_nome, acao, entidade, entidade_id, dados_antes
  )
  values (
    auth_empresa_id(), auth.uid(), coalesce(v_usuario_nome, 'desconhecido'),
    'paciente.anonimizado', 'pacientes', p_paciente_id, v_dados_antes
  );
end;
$$;
