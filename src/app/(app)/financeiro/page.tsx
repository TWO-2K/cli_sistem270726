import { createClient } from "@/lib/supabase/server";
import { requireUsuarioClinica } from "@/lib/current-clinica";
import type { Comanda, ComandaItem, Paciente, Parcela } from "@/lib/types/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegistrarPagamentoDialog } from "./registrar-pagamento-dialog";
import { ComandaDetailDialog } from "./comanda-detail-dialog";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function FinanceiroPage() {
  await requireUsuarioClinica(["admin", "financeiro"]);
  const supabase = await createClient();

  const [
    { data: comandas },
    { data: pacientes },
    { data: comandaItens },
    { data: parcelas },
  ] = await Promise.all([
    supabase
      .from("comandas")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(50)
      .returns<Comanda[]>(),
    supabase.from("pacientes").select("*").returns<Paciente[]>(),
    supabase.from("comanda_itens").select("*").returns<ComandaItem[]>(),
    supabase
      .from("parcelas")
      .select("*")
      .order("vencimento", { ascending: true })
      .returns<Parcela[]>(),
  ]);

  const pacientesMap = new Map((pacientes ?? []).map((p) => [p.id, p]));
  const itensPorComanda = new Map<string, ComandaItem[]>();
  for (const item of comandaItens ?? []) {
    const lista = itensPorComanda.get(item.comanda_id) ?? [];
    lista.push(item);
    itensPorComanda.set(item.comanda_id, lista);
  }

  const abertas = (comandas ?? []).filter((c) => c.status === "aberta");
  const totalReceber = abertas.reduce((sum, c) => sum + Number(c.total), 0);

  const parcelasPendentes = (parcelas ?? []).filter(
    (p) => p.status === "pendente",
  );
  const totalParcelasPendentes = parcelasPendentes.reduce(
    (sum, p) => sum + Number(p.valor),
    0,
  );

  const hoje = new Date().toISOString().slice(0, 10);

  // Fluxo de caixa: soma de comandas fechadas (recebidas) por dia, últimos 30 dias.
  const fechadas = (comandas ?? []).filter((c) => c.status === "fechada");
  const caixaPorDia = new Map<string, number>();
  for (const c of fechadas) {
    const dia = c.criado_em.slice(0, 10);
    caixaPorDia.set(dia, (caixaPorDia.get(dia) ?? 0) + Number(c.total));
  }
  const diasCaixa = Array.from(caixaPorDia.entries()).sort((a, b) =>
    b[0].localeCompare(a[0]),
  );
  const totalRecebido = fechadas.reduce((sum, c) => sum + Number(c.total), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">
          Comandas, pagamentos e contas a receber.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            Total a receber (comandas em aberto)
          </p>
          <p className="text-2xl font-semibold">{formatBRL(totalReceber)}</p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            Parcelas pendentes
          </p>
          <p className="text-2xl font-semibold">
            {formatBRL(totalParcelasPendentes)}
          </p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">Total recebido</p>
          <p className="text-2xl font-semibold">{formatBRL(totalRecebido)}</p>
        </div>
      </div>

      <Tabs defaultValue="comandas">
        <TabsList>
          <TabsTrigger value="comandas">Comandas</TabsTrigger>
          <TabsTrigger value="receber">Contas a receber</TabsTrigger>
          <TabsTrigger value="caixa">Fluxo de caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="comandas">
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
                    <TableCell className="flex justify-end gap-2 text-right">
                      <ComandaDetailDialog
                        comandaId={c.id}
                        itens={itensPorComanda.get(c.id) ?? []}
                        editavel={c.status === "aberta"}
                      />
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
        </TabsContent>

        <TabsContent value="receber">
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelasPendentes.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.vencimento.split("-").reverse().join("/")}
                    </TableCell>
                    <TableCell>{formatBRL(Number(p.valor))}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.vencimento < hoje ? "destructive" : "secondary"
                        }
                      >
                        {p.vencimento < hoje ? "Atrasada" : "Pendente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {parcelasPendentes.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Nenhuma parcela pendente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="caixa">
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Recebido (comandas fechadas)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diasCaixa.map(([dia, valor]) => (
                  <TableRow key={dia}>
                    <TableCell>{dia.split("-").reverse().join("/")}</TableCell>
                    <TableCell>{formatBRL(valor)}</TableCell>
                  </TableRow>
                ))}
                {diasCaixa.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Nenhum recebimento registrado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
