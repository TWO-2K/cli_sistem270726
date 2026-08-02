"use client";

import { useMemo, useState } from "react";
import type { ComissaoLancada } from "@/lib/types/db";
import { Badge } from "@empresa/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@empresa/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui/components/table";
import { MarcarComissaoPagaButton } from "./marcar-comissao-paga-button";

type ComissaoLancadaComNomes = ComissaoLancada & {
  usuarios: { nome: string } | null;
  comandas: { pacientes: { nome: string } | null } | null;
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ComissoesTabContent({
  comissoes,
  totalMes,
}: {
  comissoes: ComissaoLancadaComNomes[];
  totalMes: number;
}) {
  const [profissionalId, setProfissionalId] = useState("todos");

  const profissionais = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of comissoes) {
      map.set(c.usuario_id, c.usuarios?.nome ?? "—");
    }
    return Array.from(map.entries());
  }, [comissoes]);

  const filtradas =
    profissionalId === "todos"
      ? comissoes
      : comissoes.filter((c) => c.usuario_id === profissionalId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={profissionalId} onValueChange={(v) => setProfissionalId(v ?? "todos")}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os profissionais</SelectItem>
            {profissionais.map(([id, nome]) => (
              <SelectItem key={id} value={id}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Total do mês: <span className="font-medium text-foreground">{formatBRL(totalMes)}</span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Valor base</TableHead>
              <TableHead>Percentual</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  {c.usuarios?.nome ?? "—"}
                </TableCell>
                <TableCell>{c.comandas?.pacientes?.nome ?? "—"}</TableCell>
                <TableCell>{formatBRL(Number(c.valor_base))}</TableCell>
                <TableCell>{c.percentual_aplicado}%</TableCell>
                <TableCell>{formatBRL(Number(c.valor_comissao))}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "pago" ? "outline" : "secondary"}>
                    {c.status === "pago" ? "Pago" : "Pendente"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  {c.status === "pendente" && (
                    <MarcarComissaoPagaButton comissaoId={c.id} />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhuma comissão lançada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
