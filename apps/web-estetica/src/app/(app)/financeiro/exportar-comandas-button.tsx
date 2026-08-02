"use client";

import { Button } from "@empresa/ui/components/button";
import { toCsv, downloadCsv } from "@/lib/csv";

interface LinhaComanda {
  data: string;
  paciente: string;
  total: number;
  status: string;
}

export function ExportarComandasButton({ linhas }: { linhas: LinhaComanda[] }) {
  function handleClick() {
    const csv = toCsv(
      ["Data", "Paciente", "Total", "Status"],
      linhas.map((l) => [l.data, l.paciente, l.total.toFixed(2), l.status]),
    );
    downloadCsv("comandas.csv", csv);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick}>
      Exportar CSV
    </Button>
  );
}
