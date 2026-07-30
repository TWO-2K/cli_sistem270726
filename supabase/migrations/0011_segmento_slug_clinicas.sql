-- segmento passa de texto livre para slug fixo: é ele que define qual app
-- (web-estetica/web-odonto/web-fisio) a clínica tem acesso, então precisa
-- ser um dos valores reconhecidos pelos apps, não texto digitado à mão.

-- Normaliza dados existentes: até aqui só o app de estética existe, então
-- qualquer clínica já cadastrada (segmento nulo ou texto livre) é de estética.
update clinicas
  set segmento = 'estetica'
  where segmento is distinct from 'odonto' and segmento is distinct from 'fisio';

alter table clinicas
  alter column segmento set not null,
  add constraint clinicas_segmento_check check (segmento in ('estetica', 'odonto', 'fisio'));
