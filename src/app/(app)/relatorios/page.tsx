import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function RelatoriosPage() {
  const supabase = await createClient();

  const start30d = new Date();
  start30d.setDate(start30d.getDate() - 30);

  const [
    { count: atendimentosCount },
    { data: pagamentos },
    { count: agendamentosCount },
    { count: cancelamentosCount },
  ] = await Promise.all([
    supabase
      .from("atendimentos")
      .select("id", { count: "exact", head: true })
      .gte("criado_em", start30d.toISOString()),
    supabase
      .from("pagamentos")
      .select("valor")
      .eq("status", "pago")
      .gte("criado_em", start30d.toISOString()),
    supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .gte("data_hora", start30d.toISOString()),
    supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .in("status", ["cancelado", "faltou"])
      .gte("data_hora", start30d.toISOString()),
  ]);

  const faturamento = (pagamentos ?? []).reduce(
    (sum, p) => sum + Number(p.valor),
    0,
  );

  const cards = [
    { label: "Atendimentos (30 dias)", value: atendimentosCount ?? 0 },
    { label: "Faturamento (30 dias)", value: formatBRL(faturamento) },
    { label: "Agendamentos (30 dias)", value: agendamentosCount ?? 0 },
    {
      label: "Cancelamentos / faltas (30 dias)",
      value: cancelamentosCount ?? 0,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Visão consolidada dos últimos 30 dias.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
