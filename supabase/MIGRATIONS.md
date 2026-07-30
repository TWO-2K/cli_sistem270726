# Como aplicar migrations no Supabase

Passo a passo para criar e aplicar uma nova migration no banco remoto (projeto `MultiSistemas`, ref `jkyfjlpuvhgzstcdyhar`).

## 1. Criar o arquivo de migration

Migrations ficam em `supabase/migrations/`, numeradas sequencialmente (`0001_...sql`, `0002_...sql`, ...). Para criar uma nova, use o próximo número da sequência:

```
supabase/migrations/0012_minha_mudanca.sql
```

Pode criar o arquivo manualmente ou via CLI:

```bash
npx supabase migration new minha_mudanca
```

(o CLI gera o nome com timestamp — se preferir manter o padrão `0001`, `0002`... do projeto, renomeie o arquivo depois pra seguir a numeração sequencial já usada aqui, em vez do timestamp).

Escreva o SQL da mudança (DDL, `alter table`, `create policy`, etc.) dentro desse arquivo.

## 2. Checar se a CLI já está logada e linkada

```bash
npx supabase projects list
```

Se aparecer o projeto `jkyfjlpuvhgzstcdyhar` (MultiSistemas) com `"linked":true`, já está tudo pronto — pule pro passo 4.

Se não aparecer nenhum projeto ou pedir login, siga o passo 3.

## 3. Login e link (só necessário na primeira vez / se deslogar)

```bash
npx supabase login
```

Abre o navegador pra autenticar com a conta Supabase (dona da organização `fymeoszmvghohbvlxpsf`).

Depois, linkar o projeto local com o remoto:

```bash
npx supabase link --project-ref jkyfjlpuvhgzstcdyhar
```

O ref do projeto (`jkyfjlpuvhgzstcdyhar`) é o mesmo que aparece em `NEXT_PUBLIC_SUPABASE_URL` nos `.env.local` (`https://jkyfjlpuvhgzstcdyhar.supabase.co`).

## 4. Aplicar as migrations pendentes

```bash
npx supabase db push --linked
```

Isso conecta no banco remoto e aplica todas as migrations que ainda não foram rodadas lá, na ordem numérica. Se aparecerem erros de Docker (`failed to connect to the docker API...`), pode ignorar — são só avisos de cache de edge functions, não impedem a aplicação da migration no banco.

No final, o comando mostra um resumo tipo:

```
{"upToDate":false,"dryRun":false,"migrations":["0012_minha_mudanca.sql"], ...}
```

## 5. Conferir que aplicou

```bash
npx supabase migration list --linked
```

Mostra uma tabela comparando migrations locais (`supabase/migrations/`) com as já aplicadas no remoto. Se `local` e `remote` baterem em todas as linhas, está tudo sincronizado.

## Coisas a saber

- **Não precisa de senha do banco nem Docker rodando** para `db push` — a CLI usa o access token da conta (do `npx supabase login`) pra conectar via API de gerenciamento do Supabase.
- **Sem ambiente local do Supabase configurado aqui** (não roda `supabase start`) — todo trabalho é direto no banco remoto de desenvolvimento. Cuidado ao escrever migrations destrutivas (`drop column`, `delete from`), pois não há como testar num banco local antes.
- Sempre revisar o SQL da migration antes de rodar `db push` — não tem como desfazer um `db push` já aplicado, só criando uma migration nova que reverte a mudança.
- O nome do arquivo não importa pro Supabase (ele só olha o prefixo numérico/timestamp pra ordenar), mas manter a sequência `0001`, `0002`... facilita ler o histórico depois.
