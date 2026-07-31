-- Trava em nível de banco: no máximo 1 empresa pode estar marcada como
-- teste ao mesmo tempo. A UI de admin deixou de expor edição desse campo
-- (fica fixo na empresa já criada para isso), mas o índice garante a regra
-- mesmo contra qualquer chamada direta à API/DB.
create unique index empresas_unica_teste on empresas (is_teste) where is_teste;
