# Roadmap — status geral

Resumo rápido do que já foi implementado e o que falta, por fase/sub-fase. Detalhe completo
de cada card (descrição, plano de implementação, decisões de design) fica no documento de
planejamento original — não duplicado aqui de propósito, para não haver duas fontes de
verdade divergindo.

Legenda: ✅ concluído · 🔜 próximo indicado · ⏳ não iniciado · ⏸️ adiado (motivo na coluna)

| Fase | Sub-fase | Status | Observação |
|---|---|---|---|
| 0 | Fechar o MVP atual | ✅ | Teste manual ponta-a-ponta executado 05/08/2026 |
| 1 | 1a — Anamnese estética estruturada | ✅ | Testado manualmente |
| 1 | 1b — Comparador de fotos antes/depois | ✅ | Testado manualmente |
| 1 | 1c — Pacotes de sessões | ✅ | Testado manualmente |
| 1 | 1d — Plano de tratamento | ✅ | Testado manualmente |
| 1 | Ajuste — versionamento de anamnese | ✅ | Testado manualmente |
| 2 | 2a — Infraestrutura de notificação (e-mail) | ✅ | 13/08/2026 — escopo reduzido a e-mail (sem WhatsApp por ora). Edge Function `enviar-lembretes-agendamento` + Resend |
| 2 | 2b — Lembrete automático de agendamento | ✅ | 13/08/2026 — pg_cron a cada 15min, testado ponta-a-ponta (e-mail recebido, `lembrete_enviado_em` evita duplicidade). Falta verificar domínio no Resend para enviar a qualquer paciente (hoje só ao dono da conta, limite do modo sandbox) |
| 2 | 2c — Confirmação de presença via link | ✅ | 14/08/2026 — token por agendamento (migration 0037), rota pública `/confirmar-presenca/[token]`, link incluído automaticamente no e-mail do 2b quando status é "agendado". Testado ponta-a-ponta local |
| 2 | 2d — Lista de espera / reagendamento | ✅ | 15/08/2026 — trigger de cancelamento + 2 Edge Functions (`notificar-fila-espera`, `aceitar-oferta-fila-espera`), página `/lista-espera` e rota pública `/reservar-horario/[token]`. Testado ponta-a-ponta contra o remoto, incluindo bloqueio de segurança da RPC pra `anon` |
| 3 | 3a — Funil de leads (CRM) | ✅ | Migration 0022 (`leads`), kanban em `leads/leads-board.tsx` |
| 4 | 4a — Contas a pagar / despesas | ✅ | Migration 0023, `nova-despesa-dialog.tsx`/`marcar-despesa-paga-button.tsx` |
| 4 | 4b — Comissão de profissional | ✅ | Migrations 0024/0025/0026, aba "Comissões" em Financeiro |
| 4 | 4c — Exportação de relatórios + DRE | ✅ | `relatorios/dre/page.tsx` + botões de exportar |
| 4 | 4d — Gateway de pagamento | ⏳ | Único item pendente da Fase 4. Escopo maior, avaliar custo/benefício antes |
| 5 | 5a — Estoque de produtos | ✅ | |
| 5 | 5b — Convênios e tabelas de preço | ✅ | |
| 5 | 5c — Múltiplas unidades/filiais | ✅ | |
| 6 | 6a — Base de testes automatizados | ✅ | 07/08/2026 — Vitest, 12/12 testes passando (agenda, pagamento/parcela, exclusão restrita, RLS) |
| 6 | 6b — CI (GitHub Actions) | ⏸️ | Workflow criado (`.github/workflows/ci.yml`), lint/typecheck já passam no CI. Testes ainda falham no CI por causa dos secrets (ver nota abaixo) — pausado por decisão do usuário para focar em outra coisa, retomar depois |
| 6 | 6c — Auditoria de ações sensíveis | ✅ | 07/08/2026 |
| 6 | 6d — LGPD (exportação/exclusão de dados) | ✅ | 13/08/2026 — migration 0035, RPCs `exportar_dados_paciente`/`anonimizar_paciente`, aba "LGPD" (admin-only) na ficha do paciente. Testado via script contra o remoto |
| 6 | 6e — Observabilidade (logs + Sentry) | ✅ | 07/08/2026 — falta só teste manual com `SENTRY_DSN` real do usuário |
| 7 | 7a/7b/7c — Preparar terreno odonto/fisio | ⏳ | Só quando decidir começar o 2º app |

**Não mapeado no roadmap original, feito à parte:**
- Billing com Stripe em `apps/admin` — schema `stripe_customer_id`/`stripe_subscription_id`
  em `empresas`, checkout, webhook. Em andamento, ainda não commitado (ver `git status` do
  repo).
- ✅ **Disponibilidade própria por profissional** (15/08/2026) — migration 0040
  (`usuarios.horario_funcionamento`, nullable = herda o horário da clínica), editor
  reutilizável `horario-semana-editor.tsx`, toggle em Configurações → Usuários, validação em
  `agendamento-form-dialog.tsx`. Descoberto como lacuna real ao testar a lista de espera (2d)
  — sem isso, dias sem agendamento pareciam "livres" mesmo quando o profissional não
  trabalhava. Escopo: só bloqueio ao agendar, sem mexer na grade visual da Agenda.

## Onde está o detalhe de cada card

Documento completo (descrição, plano de implementação, decisões de design, checklists por
card): `C:\Users\kevin.soares\.claude\plans\frolicking-wandering-sprout.md`.
