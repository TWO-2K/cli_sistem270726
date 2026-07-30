@AGENTS.md

# Clínica+ — mapa do sistema

Sistema de gestão para clínicas (multi-tenant: cada linha tem `empresa_id`). Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui (Base UI) + Supabase (Postgres + Auth).

Monorepo em npm workspaces (`apps/*`, `packages/*`) — hoje com uma especialidade (estética) ativa e a fundação pronta para futuras especialidades (fisio, odonto) entrarem como novos apps.

- **`apps/web-estetica/`** — o app de clínica (porta 1010, `npm run dev:estetica` na raiz ou `npm run dev` dentro da pasta). Todo o fluxo de estética: agenda, atendimento, pacientes, financeiro, configurações, dashboard, relatórios.
- **`apps/admin/`** — painel do super_admin (porta 1000, `npm run dev:admin`). Provisionamento de empresas/admins. A tela hoje é a raiz (`/`) do app, sem prefixo `/admin`.
- **`packages/supabase`** — clients Supabase (`client.ts`, `server.ts`, `admin.ts`), `updateSession` (usado pelo `proxy.ts` de cada app), `senha-temporaria.ts`, e os tipos genuinamente compartilhados entre apps (`Perfil`, `Empresa`, `Usuario`, `HorarioDia`) em `types.ts`.
- **`packages/ui`** — primitivas shadcn (`components/*.tsx`), `cn()` (`utils.ts`), e `design-tokens.css` com o tema Tailwind v4 (`@theme inline` + tokens `:root`/`.dark`, incluindo `--modulo-estetica`/`--modulo-fisioterapia`/`--modulo-odontologia` já prontos para futuras especialidades). Cada app importa via `@import "@empresa/ui/design-tokens.css";` no próprio `globals.css`.
- **`packages/auth`** — `requireUsuarioEmpresa(redirects, perfisPermitidos?)` parametrizado por app. Cada app mantém um wrapper fino (`src/lib/current-empresa.ts`) com os próprios redirects.

## Stack e convenções

- **Sem server actions/route handlers para CRUD comum**: Client Components chamam o Supabase direto via `createClient()` de `@empresa/supabase/client`, confiando em RLS por `empresa_id`/`perfil`. Server Components usam `@empresa/supabase/server` (cookies via `@supabase/ssr`).
- `@empresa/supabase/admin` expõe `createAdminClient()` com a service role key (bypassa RLS) — **server-only**, usado só para provisionamento (super_admin cria empresa/admin; admin cria usuários). Nunca importar em Client Component.
- `apps/web-estetica/src/lib/current-empresa.ts` → `requireUsuarioEmpresa(perfisPermitidos?)`: guard de toda página autenticada do app de estética. Resolve o usuário logado + sua `empresa`, redireciona para `/login` sem sessão, `/mudar-senha` se `must_change_password`, `/admin` se `perfil === "super_admin"`, e `/dashboard` se o perfil não estiver em `perfisPermitidos`. Usar sempre no topo de `page.tsx` de área restrita, ex. `await requireUsuarioEmpresa(["admin", "financeiro"])`. É um wrapper fino sobre `requireUsuarioEmpresa` de `@empresa/auth` — a lógica genérica vive lá.
- Tipos de domínio em `apps/web-estetica/src/lib/types/db.ts` (`Agendamento`, `Comanda`, `Pagamento`, etc.) — refletem as tabelas do Supabase 1:1, sempre olhar aqui antes de assumir o shape de uma tabela. `Perfil`, `Empresa`, `Usuario`, `HorarioDia` vêm de `@empresa/supabase/types` (compartilhados entre apps) e são reexportados por esse arquivo.
- `cn()` (`@empresa/ui/utils`) é o padrão para className condicional (clsx + tailwind-merge).
- Erros de conflito de horário/agendamento do Postgres chegam como `error.code === "23P01"` (constraint de exclusão) — padrão tratado em `agendamento-form-dialog.tsx` e replicado no drag-to-reschedule (`agenda-grid.tsx`).
- Toasts via `sonner` (`toast.success`/`toast.error`), sem componente de alerta próprio.

## Perfis (RBAC)

`Perfil = "super_admin" | "admin" | "recepcao" | "profissional" | "financeiro"`.

- `super_admin`: não pertence a empresa, app próprio em `apps/admin/` (gestão de empresas/provisionamento).
- `admin`, `financeiro`: acesso a Financeiro e Configurações (`requireUsuarioEmpresa(["admin"])` / `["admin", "financeiro"]`).
- `recepcao`, `profissional`: operação do dia a dia (Agenda, Atendimento, Pacientes).
- Bloqueio é **server-side** dentro de cada `page.tsx` via `requireUsuarioEmpresa`, não só escondendo links na sidebar (ver commit "RBAC server-side: bloqueia acesso direto a Financeiro e Configuracoes por perfil").

## Módulos (`apps/web-estetica/src/app/(app)/`)

- **agenda/** — grade semanal/diária (`agenda-grid.tsx`) com cards posicionados via `top/left/height/width` absolutos calculados a partir de `HORA_ALTURA_PX` (`agenda-utils.ts`). Suporta arrastar-para-reagendar via Pointer Events nativos (sem lib de DnD) com atualização otimista (`pendingMoves`). **Cuidado**: a coluna de cada dia usa `pt-3` (padding-top) para não cortar o rótulo da primeira hora; elementos `position: absolute` (cards, linha do "agora", preview de drag) ignoram esse padding por padrão em CSS, então todo cálculo manual de `top` soma `GRID_TOP_OFFSET_PX` (=12) para ficar alinhado com as linhas reais da grade — se mexer nesse padding, atualizar a constante também.
- **atendimento/** — abre/conclui atendimentos vinculados a um agendamento, registra evolução e fotos (antes/depois, Supabase Storage).
- **financeiro/** — comandas, itens de comanda, pagamentos e parcelas. Migração `0008_rpc_registrar_pagamento.sql` move a criação de pagamento+parcelas+fechamento de comanda para uma RPC transacional (evita inserts sequenciais sem atomicidade).
- **pacientes/** — CRUD de pacientes.
- **configuracoes/** — abas de perfil da clínica, procedimentos, salas e usuários (só `admin`).
- **relatorios/**, **dashboard/** — leitura agregada.

## Banco (`supabase/migrations/`)

Migrações numeradas sequencialmente (`0001`…`0013`), aplicadas em ordem. Tabelas principais: `empresas` (tenant raiz, renomeada de `clinicas` na `0013_rename_clinicas_para_empresas.sql` — nome genérico porque a arquitetura já suporta múltiplas especialidades/verticais), `usuarios` (inclui profissionais, unificados em `usuarios` desde `0006_merge_profissionais_em_usuarios.sql`), `pacientes`, `salas`, `procedimentos`, `agendamentos` (constraint de exclusão contra conflito de horário, `0004`), `atendimentos`, `evolucoes`, `fotos_atendimento`, `comandas`, `comanda_itens`, `pagamentos`, `parcelas`. RLS por `empresa_id` + `perfil` é a linha de defesa principal para dados — não assumir que a UI é a única barreira. Schema não é dividido por especialidade — tabelas atuais já são genéricas o suficiente; tabelas específicas de uma futura especialidade (odontograma, avaliações de fisio, etc.) entram como tabelas novas quando aquele app for construído, sem exigir reestruturação do que já existe.

## Ao editar

- Ler `AGENTS.md` (e a doc correspondente em `node_modules/next/dist/docs/`) antes de usar qualquer API do Next.js — esta versão tem breaking changes vs. o Next.js "clássico".
- Verificação padrão antes de reportar concluído, rodada dentro do app/pacote afetado: `npx eslint <arquivos>` + `npx tsc --noEmit` (sem output = passou). Não há suíte de testes automatizados no projeto.
- Sem credenciais de Supabase configuradas neste ambiente de trabalho — mudanças de UI não podem ser testadas em navegador real aqui; dizer isso explicitamente em vez de assumir que funcionou.
- `.env.local` existe em cada app (`apps/web-estetica/.env.local`, `apps/admin/.env.local`) — Next só carrega `.env*` do diretório onde roda, não da raiz do monorepo. Ao atualizar credenciais, atualizar as duas cópias.

## Ao criar um novo app (`apps/web-fisio`, `apps/web-odonto`, etc.)

- **Obrigatório**: incluir `@source "../../../../packages/ui/src";` no `globals.css` do novo app, logo após `@import "@empresa/ui/design-tokens.css";`. Tailwind v4 detecta classes automaticamente varrendo a árvore do próprio app, mas não atravessa para pacotes de workspace consumidos via symlink (`node_modules/@empresa/ui`) — sem essa linha, classes usadas só dentro de `packages/ui/src/components/*.tsx` (ex. `rounded-2xl` em dialogs) silenciosamente não são geradas no CSS final, mesmo com build passando sem erro. Foi exatamente esse bug que "sumiu com as bordas" após a migração para monorepo (ver `apps/web-estetica/src/app/globals.css` e `apps/admin/src/app/globals.css` para o padrão já aplicado).
