# Clínica+ — MVP

Sistema de gestão para clínicas (estética, odonto, fisio e outros), começando
por um núcleo operacional: Agenda, Pacientes, Atendimento/Prontuário,
Comanda e Financeiro básico.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui (Base UI) +
Supabase (Postgres, Auth, Storage), multi-tenant via Row Level Security.

## Setup

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Copie `.env.local.example` para `.env.local` e preencha com a URL e a
   publishable key do seu projeto Supabase (Project Settings → API).
3. Rode a migration `supabase/migrations/0001_mvp_schema.sql` no seu projeto
   (via SQL Editor do Supabase, ou `supabase db push` se usar a CLI).
4. Instale as dependências e suba o servidor:

```bash
npm install
npm run dev
```

5. Acesse `http://localhost:3000`, clique em "Cadastre sua clínica" para
   criar sua conta e a clínica (onboarding).

## Estrutura

- `src/app/(app)` — módulos autenticados (dashboard, agenda, pacientes,
  atendimento, financeiro, relatórios, configurações), protegidos por
  `src/lib/current-clinica.ts`.
- `src/app/login`, `src/app/signup`, `src/app/onboarding` — fluxo de
  autenticação e criação da clínica.
- `src/lib/supabase` — clients Supabase (browser, server, proxy/session).
- `proxy.ts` — renova a sessão Supabase em cada request (equivalente ao
  antigo `middleware.ts` no Next.js 16).
- `supabase/migrations` — schema SQL com isolamento multi-tenant via
  `clinica_id` + RLS.

## Fluxo principal do MVP

Paciente → Agenda → Atendimento (prontuário/evolução) → Comanda (gerada
automaticamente ao concluir o atendimento) → Financeiro (recebimento) →
Relatórios.
