import { createClient } from "@empresa/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui/components/table";
import { ExportarDreButton } from "./exportar-dre-button";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mesLocal(iso: string) {
  return iso.slice(0, 7);
}

export default async function DrePage() {
  const supabase = await createClient();

  const [{ data: pagamentos }, { data: despesas }, { data: comissoes }] =
    await Promise.all([
      supabase
        .from("pagamentos")
        .select("valor, criado_em")
        .eq("status", "pago")
        .returns<{ valor: number; criado_em: string }[]>(),
      supabase
        .from("despesas")
        .select("valor, categoria, pago_em")
        .not("pago_em", "is", null)
        .returns<{ valor: number; categoria: string; pago_em: string }[]>(),
      supabase
        .from("comissoes_lancadas")
        .select("valor_comissao, criado_em")
        .returns<{ valor_comissao: number; criado_em: string }[]>(),
    ]);

  const receita = pagamentos ?? [];
  const despesasCaixa = despesas ?? [];
  const comissoesLancadas = comissoes ?? [];

  const receitaBruta = receita.reduce((sum, p) => sum + Number(p.valor), 0);
  const totalComissoes = comissoesLancadas.reduce(
    (sum, c) => sum + Number(c.valor_comissao),
    0,
  );
  const totalDespesas = despesasCaixa.reduce(
    (sum, d) => sum + Number(d.valor),
    0,
  );
  const resultado = receitaBruta - totalComissoes - totalDespesas;

  const despesasPorCategoria = new Map<string, number>();
  for (const d of despesasCaixa) {
    despesasPorCategoria.set(
      d.categoria,
      (despesasPorCategoria.get(d.categoria) ?? 0) + Number(d.valor),
    );
  }
  const categorias = Array.from(despesasPorCategoria.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  const meses = new Set<string>();
  const receitaPorMes = new Map<string, number>();
  for (const p of receita) {
    const mes = mesLocal(p.criado_em);
    meses.add(mes);
    receitaPorMes.set(mes, (receitaPorMes.get(mes) ?? 0) + Number(p.valor));
  }
  const comissaoPorMes = new Map<string, number>();
  for (const c of comissoesLancadas) {
    const mes = mesLocal(c.criado_em);
    meses.add(mes);
    comissaoPorMes.set(
      mes,
      (comissaoPorMes.get(mes) ?? 0) + Number(c.valor_comissao),
    );
  }
  const despesaPorMes = new Map<string, number>();
  for (const d of despesasCaixa) {
    const mes = mesLocal(d.pago_em);
    meses.add(mes);
    despesaPorMes.set(mes, (despesaPorMes.get(mes) ?? 0) + Number(d.valor));
  }
  const mesesOrdenados = Array.from(meses).sort((a, b) => b.localeCompare(a));
  const linhasPorMes = mesesOrdenados.map((mes) => {
    const rec = receitaPorMes.get(mes) ?? 0;
    const com = comissaoPorMes.get(mes) ?? 0;
    const desp = despesaPorMes.get(mes) ?? 0;
    return { mes, receita: rec, comissoes: com, despesas: desp, resultado: rec - com - desp };
  });

  const cards = [
    { label: "Receita bruta", value: formatBRL(receitaBruta) },
    { label: "Comissões", value: formatBRL(totalComissoes) },
    { label: "Despesas", value: formatBRL(totalDespesas) },
    { label: "Resultado", value: formatBRL(resultado) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            DRE — Demonstrativo de resultado
          </h1>
          <p className="text-muted-foreground">
            Receita bruta − comissões − despesas, regime de caixa.
          </p>
        </div>
        <ExportarDreButton linhasPorMes={linhasPorMes} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Resultado por mês</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Comissões</TableHead>
                <TableHead>Despesas</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhasPorMes.map((l) => (
                <TableRow key={l.mes}>
                  <TableCell>{l.mes}</TableCell>
                  <TableCell>{formatBRL(l.receita)}</TableCell>
                  <TableCell>{formatBRL(l.comissoes)}</TableCell>
                  <TableCell>{formatBRL(l.despesas)}</TableCell>
                  <TableCell>{formatBRL(l.resultado)}</TableCell>
                </TableRow>
              ))}
              {linhasPorMes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum dado registrado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Despesas por categoria</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map(([categoria, valor]) => (
                <TableRow key={categoria}>
                  <TableCell>{categoria}</TableCell>
                  <TableCell>{formatBRL(valor)}</TableCell>
                </TableRow>
              ))}
              {categorias.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhuma despesa paga ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
