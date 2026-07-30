"use client";

import { useState } from "react";
import { Button } from "@empresa/ui/components/button";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@empresa/ui/components/dialog";
import type { ComandaItem, Empresa, Pagamento, Paciente } from "@/lib/types/db";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ReciboDialog({
  empresa,
  paciente,
  comandaId,
  criadoEm,
  itens,
  pagamentos,
  total,
}: {
  empresa: Empresa;
  paciente: Paciente | undefined;
  comandaId: string;
  criadoEm: string;
  itens: ComandaItem[];
  pagamentos: Pagamento[];
  total: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        <FileText className="h-4 w-4" />
        Recibo
      </DialogTrigger>
      <DialogContent className="print:border-0 print:shadow-none">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #recibo-conteudo, #recibo-conteudo * { visibility: visible; }
            #recibo-conteudo { position: fixed; inset: 0; padding: 2rem; }
          }
        `}</style>
        <DialogHeader>
          <DialogTitle>Recibo</DialogTitle>
        </DialogHeader>
        <div id="recibo-conteudo" className="flex flex-col gap-4 text-sm">
          <div className="text-center">
            <p className="text-base font-semibold">{empresa.nome}</p>
            {empresa.endereco && (
              <p className="text-muted-foreground">{empresa.endereco}</p>
            )}
            {empresa.cnpj && (
              <p className="text-muted-foreground">CNPJ: {empresa.cnpj}</p>
            )}
          </div>

          <div className="flex flex-col gap-1 border-t pt-3">
            <p>
              <span className="text-muted-foreground">Comanda: </span>
              {comandaId.slice(0, 8)}
            </p>
            <p>
              <span className="text-muted-foreground">Paciente: </span>
              {paciente?.nome ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Data: </span>
              {new Date(criadoEm).toLocaleString("pt-BR")}
            </p>
          </div>

          <div className="flex flex-col gap-1 border-t pt-3">
            <p className="font-medium">Itens</p>
            {itens.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.quantidade}x {item.descricao}
                </span>
                <span>
                  {formatBRL(item.quantidade * Number(item.valor_unitario))}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t pt-3">
            <p className="font-medium">Pagamentos</p>
            {pagamentos.length === 0 && (
              <p className="text-muted-foreground">Nenhum pagamento registrado.</p>
            )}
            {pagamentos.map((pagamento) => (
              <div key={pagamento.id} className="flex justify-between">
                <span>{pagamento.forma_pagamento}</span>
                <span>{formatBRL(Number(pagamento.valor))}</span>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="print:hidden">
          <Button type="button" onClick={() => window.print()}>
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
