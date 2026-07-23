import { createClient } from "@/lib/supabase/server";
import { requireUsuarioClinica } from "@/lib/current-clinica";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DashboardPage() {
  const { clinica } = await requireUsuarioClinica();
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    { count: pacientesCount },
    { count: agendamentosHojeCount },
    { count: comandasAbertasCount },
    { data: pagamentosMes },
  ] = await Promise.all([
    supabase.from("pacientes").select("id", { count: "exact", head: true }),
    supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .gte("data_hora", startOfDay.toISOString())
      .lte("data_hora", endOfDay.toISOString()),
    supabase
      .from("comandas")
      .select("id", { count: "exact", head: true })
      .eq("status", "aberta"),
    supabase
      .from("pagamentos")
      .select("valor")
      .eq("status", "pago")
      .gte("criado_em", startOfMonth.toISOString()),
  ]);

  const faturamentoMes = (pagamentosMes ?? []).reduce(
    (sum, p) => sum + Number(p.valor),
    0,
  );

  const cards = [
    { label: "Pacientes cadastrados", value: pacientesCount ?? 0 },
    { label: "Agendamentos hoje", value: agendamentosHojeCount ?? 0 },
    { label: "Comandas em aberto", value: comandasAbertasCount ?? 0 },
    { label: "Faturamento do mês", value: formatBRL(faturamentoMes) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {clinica.nome}
        </h1>
        <p className="text-muted-foreground">
          Visão geral da sua clínica hoje.
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
