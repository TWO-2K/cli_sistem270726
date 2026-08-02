"use client";

import { Button } from "@empresa/ui/components/button";
import { toCsv, downloadCsv } from "@/lib/csv";

interface LinhaDre {
  mes: string;
  receita: number;
  comissoes: number;
  despesas: number;
  resultado: number;
}

export function ExportarDreButton({
  linhasPorMes,
}: {
  linhasPorMes: LinhaDre[];
}) {
  function handleClick() {
    const csv = toCsv(
      ["Mês", "Receita", "Comissões", "Despesas", "Resultado"],
      linhasPorMes.map((l) => [
        l.mes,
        l.receita.toFixed(2),
        l.comissoes.toFixed(2),
        l.despesas.toFixed(2),
        l.resultado.toFixed(2),
      ]),
    );
    downloadCsv("dre.csv", csv);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick}>
      Exportar CSV
    </Button>
  );
}
