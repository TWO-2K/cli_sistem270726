"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import type { Convenio, Procedimento, TabelaPrecoConvenio } from "@/lib/types/db";
import { Badge } from "@empresa/ui/components/badge";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@empresa/ui/components/dialog";

interface ConveniosTabProps {
  convenios: Convenio[];
  procedimentos: Procedimento[];
  tabelaPrecos: TabelaPrecoConvenio[];
}

export function ConveniosTab({
  convenios,
  procedimentos,
  tabelaPrecos,
}: ConveniosTabProps) {
  return (
    <div className="mt-4 flex flex-col gap-8">
      <ConveniosSection convenios={convenios} />
      <TabelaPrecosSection
        convenios={convenios}
        procedimentos={procedimentos}
        tabelaPrecos={tabelaPrecos}
      />
    </div>
  );
}

function nomeConvenio(convenios: Convenio[], id: string) {
  return convenios.find((c) => c.id === id)?.nome ?? "—";
}

function nomeProcedimento(procedimentos: Procedimento[], id: string) {
  return procedimentos.find((p) => p.id === id)?.nome ?? "—";
}

function ConveniosSection({ convenios }: { convenios: Convenio[] }) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [ativoEdicao, setAtivoEdicao] = useState(true);

  function iniciarEdicao(convenio: Convenio) {
    setEditandoId(convenio.id);
    setNomeEdicao(convenio.nome);
    setAtivoEdicao(convenio.ativo);
  }

  async function salvarEdicao(id: string) {
    setSalvandoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("convenios")
      .update({ nome: nomeEdicao, ativo: ativoEdicao })
      .eq("id", id);
    setSalvandoId(null);
    if (error) {
      toast.error("Não foi possível atualizar o convênio.");
      return;
    }
    setEditandoId(null);
    router.refresh();
  }

  async function excluirConvenio(id: string) {
    if (!window.confirm("Excluir este convênio?")) return;
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase.from("convenios").delete().eq("id", id);
    setExcluindoId(null);
    if (error) {
      toast.error("Não foi possível excluir o convênio.");
      return;
    }
    toast.success("Convênio excluído.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Convênios</h3>
        <NovoConvenioDialog />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {convenios.map((c) => (
              <TableRow key={c.id}>
                {editandoId === c.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={nomeEdicao}
                        onChange={(e) => setNomeEdicao(e.target.value)}
                        className="w-56"
                      />
                    </TableCell>
                    <TableCell>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={ativoEdicao}
                          onChange={(e) => setAtivoEdicao(e.target.checked)}
                          className="size-4 rounded border-input"
                        />
                        Ativo
                      </label>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button
                        size="sm"
                        disabled={salvandoId === c.id}
                        onClick={() => salvarEdicao(c.id)}
                      >
                        {salvandoId === c.id ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={salvandoId === c.id}
                        onClick={() => setEditandoId(null)}
                      >
                        Cancelar
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>
                      <Badge variant={c.ativo ? "secondary" : "outline"}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={excluindoId === c.id}
                        onClick={() => iniciarEdicao(c)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={excluindoId === c.id}
                        onClick={() => excluirConvenio(c.id)}
                      >
                        {excluindoId === c.id ? "Excluindo..." : "Excluir"}
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            {convenios.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhum convênio cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NovoConvenioDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("convenios").insert({ nome });

    setLoading(false);

    if (error) {
      toast.error("Não foi possível cadastrar o convênio.");
      return;
    }

    toast.success("Convênio cadastrado.");
    setNome("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Novo convênio</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo convênio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Cadastrar convênio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TabelaPrecosSection({
  convenios,
  procedimentos,
  tabelaPrecos,
}: {
  convenios: Convenio[];
  procedimentos: Procedimento[];
  tabelaPrecos: TabelaPrecoConvenio[];
}) {
  const router = useRouter();
  const [convenioId, setConvenioId] = useState(convenios[0]?.id ?? "");
  const [procedimentoId, setProcedimentoId] = useState(
    procedimentos[0]?.id ?? "",
  );
  const [preco, setPreco] = useState("0");
  const [loading, setLoading] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("tabela_precos_convenio").upsert(
      {
        convenio_id: convenioId,
        procedimento_id: procedimentoId,
        preco: Number(preco),
      },
      { onConflict: "empresa_id,convenio_id,procedimento_id" },
    );
    setLoading(false);
    if (error) {
      toast.error("Não foi possível salvar o preço.");
      return;
    }
    toast.success("Preço salvo.");
    router.refresh();
  }

  async function excluir(id: string) {
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("tabela_precos_convenio")
      .delete()
      .eq("id", id);
    setExcluindoId(null);
    if (error) {
      toast.error("Não foi possível remover o preço.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Tabela de preços por convênio</h3>
      <p className="text-sm text-muted-foreground">
        Preço tabelado cobrado quando o paciente do convênio faz o
        procedimento — sobrepõe o preço padrão do procedimento ao concluir o
        atendimento.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Convênio</label>
          <Select value={convenioId} onValueChange={(v) => setConvenioId(v ?? "")}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecione o convênio">
                {(value: string) => nomeConvenio(convenios, value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {convenios.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Procedimento</label>
          <Select
            value={procedimentoId}
            onValueChange={(v) => setProcedimentoId(v ?? "")}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecione o procedimento">
                {(value: string) => nomeProcedimento(procedimentos, value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {procedimentos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Preço (R$)</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className="w-32"
          />
        </div>
        <Button type="submit" disabled={loading || !convenioId || !procedimentoId}>
          {loading ? "Salvando..." : "Salvar preço"}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Convênio</TableHead>
              <TableHead>Procedimento</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabelaPrecos.map((tp) => (
              <TableRow key={tp.id}>
                <TableCell className="font-medium">
                  {nomeConvenio(convenios, tp.convenio_id)}
                </TableCell>
                <TableCell>
                  {nomeProcedimento(procedimentos, tp.procedimento_id)}
                </TableCell>
                <TableCell>
                  {tp.preco.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={excluindoId === tp.id}
                    onClick={() => excluir(tp.id)}
                  >
                    {excluindoId === tp.id ? "Removendo..." : "Remover"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {tabelaPrecos.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhum preço cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
