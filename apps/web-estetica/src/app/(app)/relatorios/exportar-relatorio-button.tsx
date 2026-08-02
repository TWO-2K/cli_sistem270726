"use client";

import { Button } from "@empresa/ui/components/button";
import { toCsv, downloadCsv } from "@/lib/csv";

interface LinhaRelatorio {
  dia: string;
  atendimentos: number;
  faturamento: number;
}

export function ExportarRelatorioButton({
  linhas,
}: {
  linhas: LinhaRelatorio[];
}) {
  function handleClick() {
    const csv = toCsv(
      ["Dia", "Atendimentos", "Faturamento"],
      linhas.map((l) => [l.dia, l.atendimentos, l.faturamento.toFixed(2)]),
    );
    downloadCsv("relatorio.csv", csv);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick}>
      Exportar CSV
    </Button>
  );
}
