"use client";

import { Fragment, useMemo, useState } from "react";
import type {
  ComissaoLancadaComNomes,
  ComissaoRepasseComNome,
} from "./comissoes-types";
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
import { FecharComissaoMesDialog } from "./fechar-comissao-mes-dialog";
import { MarcarRepassePagoDialog } from "./marcar-repasse-pago-dialog";

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

export function ComissoesTabContent({
  repasses,
  lancamentos,
}: {
  repasses: ComissaoRepasseComNome[];
  lancamentos: ComissaoLancadaComNomes[];
}) {
  const [expandido, setExpandido] = useState<string | null>(null);

  const pendentes = useMemo(
    () => lancamentos.filter((c) => c.status === "pendente" && !c.repasse_id),
    [lancamentos],
  );

  const profissionaisPendentes = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of pendentes) {
      map.set(c.usuario_id, c.usuarios?.nome ?? "—");
    }
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [pendentes]);

  const totalPendente = pendentes.reduce(
    (sum, c) => sum + Number(c.valor_comissao),
    0,
  );

  const lancadosPorRepasse = useMemo(() => {
    const map = new Map<string, ComissaoLancadaComNomes[]>();
    for (const c of lancamentos) {
      if (!c.repasse_id) continue;
      const lista = map.get(c.repasse_id) ?? [];
      lista.push(c);
      map.set(c.repasse_id, lista);
    }
    return map;
  }, [lancamentos]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Repasses</h3>
          <FecharComissaoMesDialog profissionais={profissionaisPendentes} />
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Valor total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Forma de pagamento</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repasses.map((r) => (
                <Fragment key={r.id}>
                  <TableRow>
                    <TableCell className="font-medium">
                      {r.usuarios?.nome ?? "—"}
                    </TableCell>
                    <TableCell className="capitalize">
                      {formatCompetencia(r.competencia)}
                    </TableCell>
                    <TableCell>{formatBRL(Number(r.valor_total))}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "pago" ? "outline" : "secondary"}>
                        {r.status === "pago" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.forma_pagamento ?? "—"}</TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
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
                      {r.status === "pendente" && (
                        <MarcarRepassePagoDialog repasseId={r.id} />
                      )}
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
                            {(lancadosPorRepasse.get(r.id) ?? []).map((c) => (
                              <TableRow key={c.id}>
                                <TableCell>
                                  {c.comandas?.pacientes?.nome ?? "—"}
                                </TableCell>
                                <TableCell>
                                  {formatBRL(Number(c.valor_base))}
                                </TableCell>
                                <TableCell>{c.percentual_aplicado}%</TableCell>
                                <TableCell>
                                  {formatBRL(Number(c.valor_comissao))}
                                </TableCell>
                                <TableCell>
                                  {new Date(c.criado_em).toLocaleDateString(
                                    "pt-BR",
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                            {(lancadosPorRepasse.get(r.id) ?? []).length ===
                              0 && (
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
                    Nenhum repasse fechado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Lançamentos pendentes</h3>
          <p className="text-sm text-muted-foreground">
            Total pendente:{" "}
            <span className="font-medium text-foreground">
              {formatBRL(totalPendente)}
            </span>
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
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendentes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.usuarios?.nome ?? "—"}
                  </TableCell>
                  <TableCell>{c.comandas?.pacientes?.nome ?? "—"}</TableCell>
                  <TableCell>{formatBRL(Number(c.valor_base))}</TableCell>
                  <TableCell>{c.percentual_aplicado}%</TableCell>
                  <TableCell>{formatBRL(Number(c.valor_comissao))}</TableCell>
                  <TableCell>
                    {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {pendentes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhuma comissão pendente.
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
