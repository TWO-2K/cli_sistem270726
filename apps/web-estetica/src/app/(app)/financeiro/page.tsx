import { createClient } from "@empresa/supabase/server";
import { requireUsuarioEmpresa } from "@/lib/current-empresa";
import type {
  Comanda,
  ComandaItem,
  Pagamento,
  Paciente,
  Parcela,
  Despesa,
} from "@/lib/types/db";
import { Badge } from "@empresa/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@empresa/ui/components/tabs";
import { RegistrarPagamentoDialog } from "./registrar-pagamento-dialog";
import { ComandaDetailDialog } from "./comanda-detail-dialog";
import { ReciboDialog } from "./recibo-dialog";
import { MarcarParcelaPagaButton } from "./marcar-parcela-paga-button";
import { NovaDespesaDialog } from "./nova-despesa-dialog";
import { MarcarDespesaPagaButton } from "./marcar-despesa-paga-button";
import { ComissoesTabContent } from "./comissoes-tab-content";
import type { ComissaoLancadaComNomes, ComissaoRepasseComNome } from "./comissoes-types";
import { ExportarComandasButton } from "./exportar-comandas-button";

type ParcelaComPaciente = Parcela & {
  pagamentos: {
    comanda_id: string;
    comandas: {
      paciente_id: string;
      pacientes: { nome: string } | null;
    } | null;
  } | null;
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function FinanceiroPage() {
  const { empresa } = await requireUsuarioEmpresa(["admin", "financeiro"]);
  const supabase = await createClient();

  const start30d = new Date();
  start30d.setDate(start30d.getDate() - 30);
  const start30dISO = start30d.toISOString();

  const [
    { data: comandas },
    { data: pacientes },
    { data: comandaItens },
    { data: pagamentos },
    { data: parcelas },
    { data: comandasFechadas30d },
    { data: despesas },
    { data: comissoesLancadas },
    { data: comissoesRepasses },
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
      .from("pagamentos")
      .select("*")
      .order("criado_em", { ascending: false })
      .returns<Pagamento[]>(),
    supabase
      .from("parcelas")
      .select("*, pagamentos(comanda_id, comandas(paciente_id, pacientes(nome)))")
      .order("vencimento", { ascending: true })
      .returns<ParcelaComPaciente[]>(),
    supabase
      .from("comandas")
      .select("*")
      .eq("status", "fechada")
      .gte("criado_em", start30dISO)
      .order("criado_em", { ascending: false })
      .returns<Comanda[]>(),
    supabase
      .from("despesas")
      .select("*")
      .order("vencimento", { ascending: true })
      .returns<Despesa[]>(),
    supabase
      .from("comissoes_lancadas")
      .select("*, usuarios(nome), comandas(pacientes(nome))")
      .order("criado_em", { ascending: false })
      .returns<ComissaoLancadaComNomes[]>(),
    supabase
      .from("comissoes_repasses")
      .select("*, usuarios(nome)")
      .order("competencia", { ascending: false })
      .returns<ComissaoRepasseComNome[]>(),
  ]);

  const pacientesMap = new Map((pacientes ?? []).map((p) => [p.id, p]));
  const itensPorComanda = new Map<string, ComandaItem[]>();
  for (const item of comandaItens ?? []) {
    const lista = itensPorComanda.get(item.comanda_id) ?? [];
    lista.push(item);
    itensPorComanda.set(item.comanda_id, lista);
  }

  const pagamentosPorComanda = new Map<string, Pagamento[]>();
  for (const pagamento of pagamentos ?? []) {
    const lista = pagamentosPorComanda.get(pagamento.comanda_id) ?? [];
    lista.push(pagamento);
    pagamentosPorComanda.set(pagamento.comanda_id, lista);
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
  const fechadas30d = comandasFechadas30d ?? [];
  const caixaPorDia = new Map<string, number>();
  for (const c of fechadas30d) {
    const dia = c.criado_em.slice(0, 10);
    caixaPorDia.set(dia, (caixaPorDia.get(dia) ?? 0) + Number(c.total));
  }
  const diasCaixa = Array.from(caixaPorDia.entries()).sort((a, b) =>
    b[0].localeCompare(a[0]),
  );
  const totalRecebido = fechadas30d.reduce(
    (sum, c) => sum + Number(c.total),
    0,
  );

  const despesasPendentes = (despesas ?? []).filter(
    (d) => d.status === "pendente",
  );
  const totalDespesasPendentes = despesasPendentes.reduce(
    (sum, d) => sum + Number(d.valor),
    0,
  );
  const despesasVencidas = despesasPendentes.filter(
    (d) => d.vencimento < hoje,
  );
  const totalDespesasVencidas = despesasVencidas.reduce(
    (sum, d) => sum + Number(d.valor),
    0,
  );

  const comissoes = comissoesLancadas ?? [];
  const repasses = comissoesRepasses ?? [];

  const linhasComandasCsv = (comandas ?? []).map((c) => ({
    data: new Date(c.criado_em).toLocaleDateString("pt-BR"),
    paciente: pacientesMap.get(c.paciente_id)?.nome ?? "—",
    total: Number(c.total),
    status: c.status === "aberta" ? "Em aberto" : "Fechada",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Comandas, pagamentos e contas a receber.
          </p>
        </div>
        <ExportarComandasButton linhas={linhasComandasCsv} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Total a receber (comandas em aberto)
          </p>
          <p className="text-2xl font-semibold">{formatBRL(totalReceber)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Parcelas pendentes
          </p>
          <p className="text-2xl font-semibold">
            {formatBRL(totalParcelasPendentes)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Total recebido (últimos 30 dias)
          </p>
          <p className="text-2xl font-semibold">{formatBRL(totalRecebido)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total a pagar</p>
          <p className="text-2xl font-semibold">
            {formatBRL(totalDespesasPendentes)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Despesas vencidas</p>
          <p className="text-2xl font-semibold">
            {formatBRL(totalDespesasVencidas)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="comandas">
        <TabsList>
          <TabsTrigger value="comandas">Comandas</TabsTrigger>
          <TabsTrigger value="receber">Contas a receber</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="caixa">Fluxo de caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="comandas">
          <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
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
                        pagamentos={pagamentosPorComanda.get(c.id) ?? []}
                        editavel={c.status === "aberta"}
                      />
                      <ReciboDialog
                        empresa={empresa}
                        paciente={pacientesMap.get(c.paciente_id)}
                        comandaId={c.id}
                        criadoEm={c.criado_em}
                        itens={itensPorComanda.get(c.id) ?? []}
                        pagamentos={pagamentosPorComanda.get(c.id) ?? []}
                        total={Number(c.total)}
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

          {(comandas ?? []).length === 0 ? (
            <div className="rounded-lg border bg-card py-8 text-center text-muted-foreground md:hidden">
              Nenhuma comanda gerada ainda. Comandas são criadas
              automaticamente ao concluir um atendimento.
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:hidden">
              {(comandas ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {pacientesMap.get(c.paciente_id)?.nome ?? "—"}
                    </span>
                    <Badge variant={c.status === "aberta" ? "default" : "outline"}>
                      {c.status === "aberta" ? "Em aberto" : "Fechada"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{new Date(c.criado_em).toLocaleDateString("pt-BR")}</span>
                    <span className="font-medium text-foreground">
                      {formatBRL(Number(c.total))}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-2">
                    <ComandaDetailDialog
                      comandaId={c.id}
                      itens={itensPorComanda.get(c.id) ?? []}
                      pagamentos={pagamentosPorComanda.get(c.id) ?? []}
                      editavel={c.status === "aberta"}
                    />
                    <ReciboDialog
                      empresa={empresa}
                      paciente={pacientesMap.get(c.paciente_id)}
                      comandaId={c.id}
                      criadoEm={c.criado_em}
                      itens={itensPorComanda.get(c.id) ?? []}
                      pagamentos={pagamentosPorComanda.get(c.id) ?? []}
                      total={Number(c.total)}
                    />
                    {c.status === "aberta" && (
                      <RegistrarPagamentoDialog
                        comandaId={c.id}
                        valorSugerido={Number(c.total)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="receber">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Comanda</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelasPendentes.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.pagamentos?.comandas?.pacientes?.nome ?? "—"}
                    </TableCell>
                    <TableCell>
                      {p.pagamentos?.comanda_id.slice(0, 8) ?? "—"}
                    </TableCell>
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
                    <TableCell className="text-right">
                      <MarcarParcelaPagaButton parcelaId={p.id} />
                    </TableCell>
                  </TableRow>
                ))}
                {parcelasPendentes.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
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

        <TabsContent value="despesas">
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <NovaDespesaDialog />
            </div>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(despesas ?? []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.descricao}
                      </TableCell>
                      <TableCell>{d.categoria}</TableCell>
                      <TableCell>{d.fornecedor ?? "—"}</TableCell>
                      <TableCell>
                        {d.vencimento.split("-").reverse().join("/")}
                      </TableCell>
                      <TableCell>{formatBRL(Number(d.valor))}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            d.status === "pago"
                              ? "outline"
                              : d.vencimento < hoje
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {d.status === "pago"
                            ? "Pago"
                            : d.vencimento < hoje
                              ? "Atrasada"
                              : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {d.status === "pendente" && (
                          <MarcarDespesaPagaButton despesaId={d.id} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(despesas ?? []).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nenhuma despesa cadastrada ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comissoes">
          <ComissoesTabContent repasses={repasses} lancamentos={comissoes} />
        </TabsContent>

        <TabsContent value="caixa">
          <div className="overflow-x-auto rounded-lg border bg-card">
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
