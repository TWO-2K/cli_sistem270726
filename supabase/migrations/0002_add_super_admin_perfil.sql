-- Novo valor de enum precisa estar em uma migration própria: o Postgres não
-- permite usar um valor de enum recém-criado na mesma transação em que foi
-- adicionado (necessário nas policies/constraints da migration seguinte).
alter type perfil add value if not exists 'super_admin';
