import { createClient } from "@/lib/supabase/server";
import type { Comanda, Paciente } from "@/lib/types/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegistrarPagamentoDialog } from "./registrar-pagamento-dialog";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function FinanceiroPage() {
  const supabase = await createClient();

  const [{ data: comandas }, { data: pacientes }] = await Promise.all([
    supabase
      .from("comandas")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(50)
      .returns<Comanda[]>(),
    supabase.from("pacientes").select("*").returns<Paciente[]>(),
  ]);

  const pacientesMap = new Map((pacientes ?? []).map((p) => [p.id, p]));

  const abertas = (comandas ?? []).filter((c) => c.status === "aberta");
  const totalReceber = abertas.reduce((sum, c) => sum + Number(c.total), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">
          Comandas, pagamentos e contas a receber.
        </p>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Total a receber (comandas em aberto)
        </p>
        <p className="text-2xl font-semibold">{formatBRL(totalReceber)}</p>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(comandas ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="font-medium">
                  {pacientesMap.get(c.paciente_id)?.nome ?? "—"}
                </TableCell>
                <TableCell>{formatBRL(Number(c.total))}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "aberta" ? "default" : "outline"}>
                    {c.status === "aberta" ? "Em aberto" : "Fechada"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {c.status === "aberta" && (
                    <RegistrarPagamentoDialog
                      comandaId={c.id}
                      valorSugerido={Number(c.total)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(comandas ?? []).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhuma comanda gerada ainda. Comandas são criadas
                  automaticamente ao concluir um atendimento.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
