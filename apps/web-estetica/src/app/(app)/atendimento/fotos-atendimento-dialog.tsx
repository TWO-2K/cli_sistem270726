"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Label } from "@empresa/ui/components/label";
import { Camera } from "lucide-react";
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

export function FotosAtendimentoDialog({
  empresaId,
  atendimentoId,
  pacienteId,
}: {
  empresaId: string;
  atendimentoId: string;
  pacienteId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<"antes" | "depois">("antes");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    setLoading(true);

    const supabase = createClient();
    const extensao = arquivo.name.split(".").pop() ?? "jpg";
    const path = `${empresaId}/${atendimentoId}/${tipo}-${Date.now()}.${extensao}`;

    const { error: uploadError } = await supabase.storage
      .from("fotos-atendimento")
      .upload(path, arquivo);

    if (uploadError) {
      toast.error("Não foi possível enviar a foto.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("fotos_atendimento")
      .insert({
        atendimento_id: atendimentoId,
        paciente_id: pacienteId,
        url: path,
        tipo,
      });

    setLoading(false);

    if (insertError) {
      toast.error("Não foi possível registrar a foto.");
      return;
    }

    toast.success("Foto adicionada.");
    setArquivo(null);
    setInputKey((k) => k + 1);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Camera className="h-4 w-4" />
        Fotos
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar foto do atendimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(value) =>
                setTipo((value as "antes" | "depois") ?? "antes")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="antes">Antes</SelectItem>
                <SelectItem value="depois">Depois</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="arquivo">Imagem</Label>
            <input
              key={inputKey}
              id="arquivo"
              type="file"
              accept="image/*"
              required
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !arquivo}>
              {loading ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
