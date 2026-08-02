"use client";

import { Fragment, useMemo, useState } from "react";
import type {
  ComissaoLancadaComNomes,
  ComissaoRepasseComNome,
} from "../financeiro/comissoes-types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";
import { Badge } from "@empresa/ui/components/badge";
import { Button } from "@empresa/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui/components/table";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompetencia(competencia: string) {
  const [ano, mes] = competencia.split("-");
  return new Date(Number(ano), Number(mes) - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export function MinhasComissoesContent({
  repasses,
  lancamentos,
}: {
  repasses: ComissaoRepasseComNome[];
  lancamentos: ComissaoLancadaComNomes[];
}) {
  const [expandido, setExpandido] = useState<string | null>(null);

  const totalPendente = lancamentos
    .filter((l) => l.status === "pendente" && !l.repasse_id)
    .reduce((sum, l) => sum + Number(l.valor_comissao), 0);

  const lancadosPorRepasse = useMemo(() => {
    const map = new Map<string, ComissaoLancadaComNomes[]>();
    for (const l of lancamentos) {
      if (!l.repasse_id) continue;
      const lista = map.get(l.repasse_id) ?? [];
      lista.push(l);
      map.set(l.repasse_id, lista);
    }
    return map;
  }, [lancamentos]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Pendente este mês (ainda não fechado)</CardDescription>
            <CardTitle className="text-3xl">{formatBRL(totalPendente)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Valor total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pago em</TableHead>
              <TableHead>Forma de pagamento</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repasses.map((r) => (
              <Fragment key={r.id}>
                <TableRow>
                  <TableCell className="font-medium capitalize">
                    {formatCompetencia(r.competencia)}
                  </TableCell>
                  <TableCell>{formatBRL(Number(r.valor_total))}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "pago" ? "outline" : "secondary"}>
                      {r.status === "pago" ? "Pago" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.pago_em
                      ? new Date(r.pago_em).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell>{r.forma_pagamento ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setExpandido(expandido === r.id ? null : r.id)
                      }
                    >
                      {expandido === r.id ? "Ocultar" : "Ver lançamentos"}
                    </Button>
                  </TableCell>
                </TableRow>
                {expandido === r.id && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/30 p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Valor base</TableHead>
                            <TableHead>Percentual</TableHead>
                            <TableHead>Comissão</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(lancadosPorRepasse.get(r.id) ?? []).map((l) => (
                            <TableRow key={l.id}>
                              <TableCell>
                                {l.comandas?.pacientes?.nome ?? "—"}
                              </TableCell>
                              <TableCell>{formatBRL(Number(l.valor_base))}</TableCell>
                              <TableCell>{l.percentual_aplicado}%</TableCell>
                              <TableCell>
                                {formatBRL(Number(l.valor_comissao))}
                              </TableCell>
                              <TableCell>
                                {new Date(l.criado_em).toLocaleDateString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          ))}
                          {(lancadosPorRepasse.get(r.id) ?? []).length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="py-4 text-center text-muted-foreground"
                              >
                                Nenhum lançamento carregado.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
            {repasses.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhum repasse recebido ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
