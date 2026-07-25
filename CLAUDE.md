@AGENTS.md

# Clínica+ — mapa do sistema

Sistema de gestão para clínicas (multi-tenant: cada linha tem `clinica_id`). Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui (Base UI) + Supabase (Postgres + Auth). Porta de dev: 3020 (`npm run dev`).

## Stack e convenções

- **Sem server actions/route handlers para CRUD comum**: Client Components chamam o Supabase direto via `createClient()` de `src/lib/supabase/client.ts`, confiando em RLS por `clinica_id`/`perfil`. Server Components usam `src/lib/supabase/server.ts` (cookies via `@supabase/ssr`).
- `src/lib/supabase/admin.ts` expõe `createAdminClient()` com a service role key (bypassa RLS) — **server-only**, usado só para provisionamento (super_admin cria clínica/admin; admin cria usuários). Nunca importar em Client Component.
- `src/lib/current-clinica.ts` → `requireUsuarioClinica(perfisPermitidos?)`: guard de toda página autenticada. Resolve o usuário logado + sua `clinica`, redireciona para `/login` sem sessão, `/mudar-senha` se `must_change_password`, `/admin` se `perfil === "super_admin"`, e `/dashboard` se o perfil não estiver em `perfisPermitidos`. Usar sempre no topo de `page.tsx` de área restrita, ex. `await requireUsuarioClinica(["admin", "financeiro"])`.
- Tipos de domínio centralizados em `src/lib/types/db.ts` (`Perfil`, `Agendamento`, `Comanda`, `Pagamento`, etc.) — refletem as tabelas do Supabase 1:1, sempre olhar aqui antes de assumir o shape de uma tabela.
- `cn()` (`src/lib/utils.ts`) é o padrão para className condicional (clsx + tailwind-merge).
- Erros de conflito de horário/agendamento do Postgres chegam como `error.code === "23P01"` (constraint de exclusão) — padrão tratado em `agendamento-form-dialog.tsx` e replicado no drag-to-reschedule (`agenda-grid.tsx`).
- Toasts via `sonner` (`toast.success`/`toast.error`), sem componente de alerta próprio.

## Perfis (RBAC)

`Perfil = "super_admin" | "admin" | "recepcao" | "profissional" | "financeiro"`.

- `super_admin`: não pertence a clínica, área própria em `src/app/admin/` (gestão de clínicas/provisionamento).
- `admin`, `financeiro`: acesso a Financeiro e Configurações (`requireUsuarioClinica(["admin"])` / `["admin", "financeiro"]`).
- `recepcao`, `profissional`: operação do dia a dia (Agenda, Atendimento, Pacientes).
- Bloqueio é **server-side** dentro de cada `page.tsx` via `requireUsuarioClinica`, não só escondendo links na sidebar (ver commit "RBAC server-side: bloqueia acesso direto a Financeiro e Configuracoes por perfil").

## Módulos (`src/app/(app)/`)

- **agenda/** — grade semanal/diária (`agenda-grid.tsx`) com cards posicionados via `top/left/height/width` absolutos calculados a partir de `HORA_ALTURA_PX` (`agenda-utils.ts`). Suporta arrastar-para-reagendar via Pointer Events nativos (sem lib de DnD) com atualização otimista (`pendingMoves`). **Cuidado**: a coluna de cada dia usa `pt-3` (padding-top) para não cortar o rótulo da primeira hora; elementos `position: absolute` (cards, linha do "agora", preview de drag) ignoram esse padding por padrão em CSS, então todo cálculo manual de `top` soma `GRID_TOP_OFFSET_PX` (=12) para ficar alinhado com as linhas reais da grade — se mexer nesse padding, atualizar a constante também.
- **atendimento/** — abre/conclui atendimentos vinculados a um agendamento, registra evolução e fotos (antes/depois, Supabase Storage).
- **financeiro/** — comandas, itens de comanda, pagamentos e parcelas. Migração `0008_rpc_registrar_pagamento.sql` move a criação de pagamento+parcelas+fechamento de comanda para uma RPC transacional (evita inserts sequenciais sem atomicidade).
- **pacientes/** — CRUD de pacientes.
- **configuracoes/** — abas de perfil da clínica, procedimentos, salas e usuários (só `admin`).
- **relatorios/**, **dashboard/** — leitura agregada.

## Banco (`supabase/migrations/`)

Migrações numeradas sequencialmente (`0001`…`0008`), aplicadas em ordem. Tabelas principais: `clinicas`, `usuarios` (inclui profissionais, unificados em `usuarios` desde `0006_merge_profissionais_em_usuarios.sql`), `pacientes`, `salas`, `procedimentos`, `agendamentos` (constraint de exclusão contra conflito de horário, `0004`), `atendimentos`, `evolucoes`, `fotos_atendimento`, `comandas`, `comanda_itens`, `pagamentos`, `parcelas`. RLS por `clinica_id` + `perfil` é a linha de defesa principal para dados — não assumir que a UI é a única barreira.

## Ao editar

- Ler `AGENTS.md` (e a doc correspondente em `node_modules/next/dist/docs/`) antes de usar qualquer API do Next.js — esta versão tem breaking changes vs. o Next.js "clássico".
- Verificação padrão antes de reportar concluído: `npx eslint <arquivos>` + `npx tsc --noEmit -p tsconfig.json` (sem output = passou). Não há suíte de testes automatizados no projeto.
- Sem credenciais de Supabase configuradas neste ambiente de trabalho — mudanças de UI não podem ser testadas em navegador real aqui; dizer isso explicitamente em vez de assumir que funcionou.
