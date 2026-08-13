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
| 2 | 2a — Infraestrutura de notificação | ⏸️ | Adiada — sem decisão de hospedagem / sem demanda real ainda |
| 2 | 2b — Lembrete automático de agendamento | ⏸️ | Depende de 2a |
| 2 | 2c — Confirmação de presença via link | ⏸️ | Depende de 2a |
| 2 | 2d — Lista de espera / reagendamento | ⏸️ | Adiada junto com a fase |
| 3 | 3a — Funil de leads (CRM) | ⏳ | Próxima fase ativa candidata após a 2 (que está adiada) |
| 4 | 4a — Contas a pagar / despesas | ✅ | Migration 0023, `nova-despesa-dialog.tsx`/`marcar-despesa-paga-button.tsx` |
| 4 | 4b — Comissão de profissional | ✅ | Migrations 0024/0025/0026, aba "Comissões" em Financeiro |
| 4 | 4c — Exportação de relatórios + DRE | ✅ | `relatorios/dre/page.tsx` + botões de exportar |
| 4 | 4d — Gateway de pagamento | ⏳ | Único item pendente da Fase 4. Escopo maior, avaliar custo/benefício antes |
| 5 | 5a — Estoque de produtos | ✅ | |
| 5 | 5b — Convênios e tabelas de preço | ✅ | |
| 5 | 5c — Múltiplas unidades/filiais | ✅ | |
| 6 | 6a — Base de testes automatizados | ✅ | 07/08/2026 — Vitest, 12/12 testes passando (agenda, pagamento/parcela, exclusão restrita, RLS) |
| 6 | 6b — CI (GitHub Actions) | ✅ | `.github/workflows/ci.yml` criado (lint+typecheck+testes a cada push/PR). **Falta você adicionar os 5 secrets no GitHub** (ver README do workflow abaixo) — sem eles o job falha |
| 6 | 6c — Auditoria de ações sensíveis | ✅ | 07/08/2026 |
| 6 | 6d — LGPD (exportação/exclusão de dados) | ⏳ | Depende conceitualmente de 6c, que já existe |
| 6 | 6e — Observabilidade (logs + Sentry) | ✅ | 07/08/2026 — falta só teste manual com `SENTRY_DSN` real do usuário |
| 7 | 7a/7b/7c — Preparar terreno odonto/fisio | ⏳ | Só quando decidir começar o 2º app |

**Não mapeado no roadmap original, feito à parte:** billing com Stripe em `apps/admin` —
schema `stripe_customer_id`/`stripe_subscription_id` em `empresas`, checkout, webhook. Em
andamento, ainda não commitado (ver `git status` do repo).

## Onde está o detalhe de cada card

Documento completo (descrição, plano de implementação, decisões de design, checklists por
card): `C:\Users\kevin.soares\.claude\plans\frolicking-wandering-sprout.md`.
