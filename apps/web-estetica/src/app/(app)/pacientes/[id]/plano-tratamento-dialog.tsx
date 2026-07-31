"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@empresa/supabase/client";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@empresa/ui/components/dialog";
import type { Procedimento } from "@/lib/types/db";

interface EtapaForm {
  key: string;
  procedimentoId: string;
  descricao: string;
}

function novaEtapa(): EtapaForm {
  return { key: crypto.randomUUID(), procedimentoId: "", descricao: "" };
}

export function PlanoTratamentoDialog({
  pacienteId,
  procedimentos,
}: {
  pacienteId: string;
  procedimentos: Procedimento[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [etapas, setEtapas] = useState<EtapaForm[]>([novaEtapa()]);

  const podeSubmeter =
    titulo.trim().length > 0 &&
    etapas.length > 0 &&
    etapas.every((e) => e.descricao.trim().length > 0);

  function atualizarEtapa(key: string, patch: Partial<EtapaForm>) {
    setEtapas((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  }

  function removerEtapa(key: string) {
    setEtapas((prev) => prev.filter((e) => e.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeSubmeter) return;
    setLoading(true);
    const supabase = createClient();

    const { data: plano, error: planoError } = await supabase
      .from("planos_tratamento")
      .insert({ paciente_id: pacienteId, titulo: titulo.trim() })
      .select("id")
      .single();

    if (planoError || !plano) {
      toast.error("Não foi possível criar o plano de tratamento.");
      setLoading(false);
      return;
    }

    const { error: etapasError } = await supabase.from("plano_tratamento_etapas").insert(
      etapas.map((etapa, index) => ({
        plano_id: plano.id,
        ordem: index + 1,
        procedimento_id: etapa.procedimentoId || null,
        descricao: etapa.descricao.trim(),
      })),
    );

    setLoading(false);

    if (etapasError) {
      toast.error("Plano criado, mas não foi possível salvar as etapas.");
      return;
    }

    toast.success("Plano de tratamento criado.");
    setTitulo("");
    setEtapas([novaEtapa()]);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Novo plano
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo plano de tratamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Rejuvenescimento facial"
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label>Etapas</Label>
            {etapas.map((etapa, index) => (
              <div key={etapa.key} className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Etapa {index + 1}</span>
                  {etapas.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerEtapa(etapa.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select
                  value={etapa.procedimentoId}
                  onValueChange={(value) =>
                    atualizarEtapa(etapa.key, { procedimentoId: value ?? "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Procedimento (opcional)">
                      {(value: string) =>
                        procedimentos.find((p) => p.id === value)?.nome ??
                        "Procedimento (opcional)"
                      }
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
                <Input
                  required
                  value={etapa.descricao}
                  onChange={(e) => atualizarEtapa(etapa.key, { descricao: e.target.value })}
                  placeholder="Descrição da etapa"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEtapas((prev) => [...prev, novaEtapa()])}
            >
              <Plus className="h-4 w-4" />
              Adicionar etapa
            </Button>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading || !podeSubmeter}>
              {loading ? "Salvando..." : "Criar plano"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
