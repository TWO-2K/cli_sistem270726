"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

function mesAtual() {
  return new Date().toISOString().slice(0, 7);
}

export function FecharComissaoMesDialog({
  profissionais,
}: {
  profissionais: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usuarioId, setUsuarioId] = useState(profissionais[0]?.id ?? "");
  const [competencia, setCompetencia] = useState(mesAtual());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usuarioId) return;
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.rpc("fechar_comissoes_mes", {
      p_usuario_id: usuarioId,
      p_competencia: `${competencia}-01`,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message || "Não foi possível fechar o mês.");
      return;
    }

    toast.success("Comissões do mês fechadas em um repasse.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Fechar mês
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar comissões do mês</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Profissional</Label>
            <Select value={usuarioId} onValueChange={(v) => setUsuarioId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional">
                  {(value: string) =>
                    profissionais.find((p) => p.id === value)?.nome ??
                    "Selecione o profissional"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {profissionais.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="competencia">Mês de competência</Label>
            <Input
              id="competencia"
              type="month"
              required
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !usuarioId}>
              {loading ? "Fechando..." : "Fechar mês"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
