"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import type { Procedimento, Produto, ProdutoProcedimento } from "@/lib/types/db";
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

interface ProdutosTabProps {
  produtos: Produto[];
  procedimentos: Procedimento[];
  vinculos: ProdutoProcedimento[];
}

export function ProdutosTab({
  produtos,
  procedimentos,
  vinculos,
}: ProdutosTabProps) {
  return (
    <div className="mt-4 flex flex-col gap-8">
      <ProdutosSection produtos={produtos} />
      <VinculoSection
        produtos={produtos}
        procedimentos={procedimentos}
        vinculos={vinculos}
      />
    </div>
  );
}

function nomeProduto(produtos: Produto[], id: string) {
  return produtos.find((p) => p.id === id)?.nome ?? "—";
}

function nomeProcedimento(procedimentos: Procedimento[], id: string) {
  return procedimentos.find((p) => p.id === id)?.nome ?? "—";
}

interface EdicaoProduto {
  nome: string;
  unidadeMedida: string;
  estoqueAtual: string;
  estoqueMinimo: string;
}

function ProdutosSection({ produtos }: { produtos: Produto[] }) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<EdicaoProduto>({
    nome: "",
    unidadeMedida: "un",
    estoqueAtual: "0",
    estoqueMinimo: "0",
  });

  function iniciarEdicao(produto: Produto) {
    setEditandoId(produto.id);
    setEdicao({
      nome: produto.nome,
      unidadeMedida: produto.unidade_medida,
      estoqueAtual: String(produto.estoque_atual),
      estoqueMinimo: String(produto.estoque_minimo),
    });
  }

  async function salvarEdicao(id: string) {
    setSalvandoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("produtos")
      .update({
        nome: edicao.nome,
        unidade_medida: edicao.unidadeMedida,
        estoque_atual: Number(edicao.estoqueAtual),
        estoque_minimo: Number(edicao.estoqueMinimo),
      })
      .eq("id", id);
    setSalvandoId(null);
    if (error) {
      toast.error("Não foi possível atualizar o produto.");
      return;
    }
    setEditandoId(null);
    router.refresh();
  }

  async function excluirProduto(id: string) {
    if (!window.confirm("Excluir este produto?")) return;
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    setExcluindoId(null);
    if (error) {
      toast.error("Não foi possível excluir o produto.");
      return;
    }
    toast.success("Produto excluído.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Produtos</h3>
        <NovoProdutoDialog />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Estoque atual</TableHead>
              <TableHead>Estoque mínimo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((p) => (
              <TableRow key={p.id}>
                {editandoId === p.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={edicao.nome}
                        onChange={(e) =>
                          setEdicao((prev) => ({ ...prev, nome: e.target.value }))
                        }
                        className="w-40"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={edicao.unidadeMedida}
                        onChange={(e) =>
                          setEdicao((prev) => ({
                            ...prev,
                            unidadeMedida: e.target.value,
                          }))
                        }
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={edicao.estoqueAtual}
                        onChange={(e) =>
                          setEdicao((prev) => ({
                            ...prev,
                            estoqueAtual: e.target.value,
                          }))
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={edicao.estoqueMinimo}
                        onChange={(e) =>
                          setEdicao((prev) => ({
                            ...prev,
                            estoqueMinimo: e.target.value,
                          }))
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell />
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button
                        size="sm"
                        disabled={salvandoId === p.id}
                        onClick={() => salvarEdicao(p.id)}
                      >
                        {salvandoId === p.id ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={salvandoId === p.id}
                        onClick={() => setEditandoId(null)}
                      >
                        Cancelar
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{p.unidade_medida}</TableCell>
                    <TableCell>{p.estoque_atual}</TableCell>
                    <TableCell>{p.estoque_minimo}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.estoque_atual <= p.estoque_minimo
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {p.estoque_atual <= p.estoque_minimo
                          ? "Estoque baixo"
                          : "OK"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={excluindoId === p.id}
                        onClick={() => iniciarEdicao(p)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={excluindoId === p.id}
                        onClick={() => excluirProduto(p.id)}
                      >
                        {excluindoId === p.id ? "Excluindo..." : "Excluir"}
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
            {produtos.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhum produto cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NovoProdutoDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [unidadeMedida, setUnidadeMedida] = useState("un");
  const [estoqueAtual, setEstoqueAtual] = useState("0");
  const [estoqueMinimo, setEstoqueMinimo] = useState("0");

  function limpar() {
    setNome("");
    setUnidadeMedida("un");
    setEstoqueAtual("0");
    setEstoqueMinimo("0");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("produtos").insert({
      nome,
      unidade_medida: unidadeMedida,
      estoque_atual: Number(estoqueAtual),
      estoque_minimo: Number(estoqueMinimo),
    });

    setLoading(false);

    if (error) {
      toast.error("Não foi possível cadastrar o produto.");
      return;
    }

    toast.success("Produto cadastrado.");
    limpar();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Novo produto</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="unidade">Unidade de medida</Label>
            <Input
              id="unidade"
              required
              value={unidadeMedida}
              onChange={(e) => setUnidadeMedida(e.target.value)}
              placeholder="un, ml, g..."
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="estoqueAtual">Estoque atual</Label>
            <Input
              id="estoqueAtual"
              type="number"
              min={0}
              step={0.01}
              value={estoqueAtual}
              onChange={(e) => setEstoqueAtual(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="estoqueMinimo">Estoque mínimo</Label>
            <Input
              id="estoqueMinimo"
              type="number"
              min={0}
              step={0.01}
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Cadastrar produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VinculoSection({
  produtos,
  procedimentos,
  vinculos,
}: {
  produtos: Produto[];
  procedimentos: Procedimento[];
  vinculos: ProdutoProcedimento[];
}) {
  const router = useRouter();
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? "");
  const [procedimentoId, setProcedimentoId] = useState(
    procedimentos[0]?.id ?? "",
  );
  const [quantidade, setQuantidade] = useState("1");
  const [loading, setLoading] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("produto_procedimento").upsert(
      {
        produto_id: produtoId,
        procedimento_id: procedimentoId,
        quantidade_consumida: Number(quantidade),
      },
      { onConflict: "empresa_id,produto_id,procedimento_id" },
    );
    setLoading(false);
    if (error) {
      toast.error("Não foi possível salvar o vínculo.");
      return;
    }
    toast.success("Vínculo salvo.");
    router.refresh();
  }

  async function excluir(id: string) {
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("produto_procedimento")
      .delete()
      .eq("id", id);
    setExcluindoId(null);
    if (error) {
      toast.error("Não foi possível remover o vínculo.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Consumo por procedimento</h3>
      <p className="text-sm text-muted-foreground">
        Quanto de cada produto é consumido ao concluir um atendimento com o
        procedimento selecionado — o estoque é baixado automaticamente.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Produto</label>
          <Select value={produtoId} onValueChange={(v) => setProdutoId(v ?? "")}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecione o produto">
                {(value: string) => nomeProduto(produtos, value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {produtos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
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
          <label className="text-sm font-medium">Quantidade consumida</label>
          <Input
            type="number"
            min={0.01}
            step={0.01}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="w-32"
          />
        </div>
        <Button type="submit" disabled={loading || !produtoId || !procedimentoId}>
          {loading ? "Salvando..." : "Salvar vínculo"}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Procedimento</TableHead>
              <TableHead>Quantidade consumida</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vinculos.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">
                  {nomeProduto(produtos, v.produto_id)}
                </TableCell>
                <TableCell>
                  {nomeProcedimento(procedimentos, v.procedimento_id)}
                </TableCell>
                <TableCell>{v.quantidade_consumida}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={excluindoId === v.id}
                    onClick={() => excluir(v.id)}
                  >
                    {excluindoId === v.id ? "Removendo..." : "Remover"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {vinculos.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhum vínculo cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
