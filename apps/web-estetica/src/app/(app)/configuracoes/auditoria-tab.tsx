"use client";

import { useMemo, useState } from "react";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@empresa/ui/components/dialog";
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
import type { AuditLog } from "@/lib/types/db";

const PAGE_SIZE = 50;

export function AuditoriaTab({ registros }: { registros: AuditLog[] }) {
  const [lista, setLista] = useState(registros);
  const [entidadeFiltro, setEntidadeFiltro] = useState("__todas__");
  const [carregando, setCarregando] = useState(false);
  const [fimDaLista, setFimDaLista] = useState(registros.length < PAGE_SIZE);

  const entidades = useMemo(
    () => Array.from(new Set(registros.map((r) => r.entidade))).sort(),
    [registros],
  );

  const filtrados = useMemo(
    () =>
      entidadeFiltro === "__todas__"
        ? lista
        : lista.filter((r) => r.entidade === entidadeFiltro),
    [lista, entidadeFiltro],
  );

  async function carregarMais() {
    setCarregando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .order("criado_em", { ascending: false })
      .range(lista.length, lista.length + PAGE_SIZE - 1)
      .returns<AuditLog[]>();
    setCarregando(false);
    if (!data || data.length === 0) {
      setFimDaLista(true);
      return;
    }
    setLista((atual) => [...atual, ...data]);
    if (data.length < PAGE_SIZE) setFimDaLista(true);
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Registro de ações sensíveis (pagamentos, parcelas e exclusões).
        Trilha somente leitura — não pode ser editada nem apagada pelo app.
      </p>

      <Select
        value={entidadeFiltro}
        onValueChange={(value) => setEntidadeFiltro(value ?? "__todas__")}
      >
        <SelectTrigger className="w-56">
          <SelectValue>
            {(value: string) => (value === "__todas__" ? "Todas as entidades" : value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__todas__">Todas as entidades</SelectItem>
          {entidades.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((registro) => (
              <TableRow key={registro.id}>
                <TableCell>
                  {new Date(registro.criado_em).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>{registro.usuario_nome}</TableCell>
                <TableCell className="font-medium">{registro.acao}</TableCell>
                <TableCell>{registro.entidade}</TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger render={<Button size="sm" variant="ghost" />}>
                      Ver
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {registro.acao} — {registro.entidade}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-3 text-sm">
                        <p>
                          <span className="text-muted-foreground">Usuário: </span>
                          {registro.usuario_nome}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Data: </span>
                          {new Date(registro.criado_em).toLocaleString("pt-BR")}
                        </p>
                        {registro.dados_antes && (
                          <div>
                            <p className="font-medium">Antes</p>
                            <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
                              {JSON.stringify(registro.dados_antes, null, 2)}
                            </pre>
                          </div>
                        )}
                        {registro.dados_depois && (
                          <div>
                            <p className="font-medium">Depois</p>
                            <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
                              {JSON.stringify(registro.dados_depois, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhum registro de auditoria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!fimDaLista && (
        <Button
          variant="outline"
          onClick={carregarMais}
          disabled={carregando}
          className="self-start"
        >
          {carregando ? "Carregando..." : "Carregar mais"}
        </Button>
      )}
    </div>
  );
}
