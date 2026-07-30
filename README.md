# Clínica+ — MVP

Sistema de gestão para clínicas (estética, odonto, fisio e outros), começando
por um núcleo operacional: Agenda, Pacientes, Atendimento/Prontuário,
Comanda e Financeiro básico.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui (Base UI) +
Supabase (Postgres, Auth, Storage), multi-tenant via Row Level Security.

## Setup

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Copie `.env.local.example` para `.env.local` e preencha com a URL, a
   publishable key e a **service role key** do seu projeto Supabase (Project
   Settings → API). A service role key só é usada em código server-only.
3. Rode as migrations em `supabase/migrations/` (em ordem, via SQL Editor do
   Supabase ou `supabase db push` se usar a CLI).
4. Instale as dependências e suba o servidor:

```bash
npm install
npm run dev:estetica
```

5. Acesse `http://localhost:1010` (app de clínica). Para o painel de administração,
   rode `npm run dev:admin` e acesse `http://localhost:1000`.

## Provisionamento de usuários

Não existe cadastro público. Todo usuário é criado por um administrador:

1. **Bootstrap do super_admin** (uma vez por ambiente): rode
   ```bash
   node --env-file=.env.local scripts/create-super-admin.mjs seu@email.com "senha" "Seu Nome"
   ```
2. Entre em `/login` com esse usuário — como é super_admin, você cai no
   painel `/admin`, onde cria clínicas e o admin de cada uma (o sistema gera
   uma senha temporária para repassar ao cliente).
3. O admin de cada clínica entra em Configurações → Usuários para cadastrar
   recepção, profissionais e financeiro dessa clínica, também com senha
   temporária.
4. No primeiro login, todo usuário criado por um admin é obrigado a trocar a
   senha (`/mudar-senha`) antes de acessar o sistema.

## Estrutura

- `src/app/(app)` — módulos autenticados (dashboard, agenda, pacientes,
  atendimento, financeiro, relatórios, configurações), protegidos por
  `src/lib/current-clinica.ts`.
- `src/app/login`, `src/app/mudar-senha` — autenticação e troca de senha
  obrigatória no primeiro acesso.
- `src/app/admin` — painel do super_admin (cria clínicas + admin de cada
  uma). `scripts/create-super-admin.mjs` cria o primeiro super_admin.
- `src/lib/supabase` — clients Supabase (browser, server, proxy/session).
- `proxy.ts` — renova a sessão Supabase em cada request (equivalente ao
  antigo `middleware.ts` no Next.js 16).
- `supabase/migrations` — schema SQL com isolamento multi-tenant via
  `clinica_id` + RLS.

## Fluxo principal do MVP

Paciente → Agenda → Atendimento (prontuário/evolução) → Comanda (gerada
automaticamente ao concluir o atendimento) → Financeiro (recebimento) →
Relatórios.
