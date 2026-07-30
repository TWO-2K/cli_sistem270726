"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Label } from "@empresa/ui/components/label";
import { Textarea } from "@empresa/ui/components/textarea";
import type { AnamneseRespostas, Procedimento, TipoPele } from "@/lib/types/db";
import { TIPO_PELE_LABELS } from "@/lib/types/db";
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

const CAMPOS: { chave: keyof AnamneseRespostas; label: string; placeholder?: string }[] = [
  { chave: "queixa_principal", label: "Queixa principal" },
  { chave: "historico_saude", label: "Histórico de saúde relevante" },
  { chave: "alergias", label: "Alergias", placeholder: "Nenhuma conhecida" },
  { chave: "medicacoes_em_uso", label: "Medicações em uso" },
  {
    chave: "procedimentos_anteriores",
    label: "Procedimentos estéticos anteriores",
  },
];

const RESPOSTAS_VAZIAS: AnamneseRespostas = {
  queixa_principal: "",
  historico_saude: "",
  alergias: "",
  medicacoes_em_uso: "",
  procedimentos_anteriores: "",
};

const TIPOS_PELE: TipoPele[] = [1, 2, 3, 4, 5, 6];

export function NovaAnamneseDialog({
  pacienteId,
  procedimentos,
}: {
  pacienteId: string;
  procedimentos: Procedimento[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [respostas, setRespostas] =
    useState<AnamneseRespostas>(RESPOSTAS_VAZIAS);
  const [tipoPele, setTipoPele] = useState<TipoPele | null>(null);
  const [contraindicados, setContraindicados] = useState<Set<string>>(new Set());

  function toggleContraindicado(procedimentoId: string) {
    setContraindicados((prev) => {
      const next = new Set(prev);
      if (next.has(procedimentoId)) {
        next.delete(procedimentoId);
      } else {
        next.add(procedimentoId);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: anamnese, error } = await supabase
      .from("anamneses")
      .insert({
        paciente_id: pacienteId,
        respostas,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !anamnese) {
      setLoading(false);
      toast.error("Não foi possível registrar a anamnese.");
      return;
    }

    const { error: esteticaError } = await supabase
      .schema("estetica")
      .from("anamnese_estetica")
      .insert({ anamnese_id: anamnese.id, tipo_pele: tipoPele });

    if (esteticaError) {
      setLoading(false);
      toast.error("Anamnese salva, mas os dados estéticos falharam.");
      return;
    }

    if (contraindicados.size > 0) {
      const { error: contraindicacaoError } = await supabase
        .schema("estetica")
        .from("anamnese_estetica_contraindicacao")
        .insert(
          Array.from(contraindicados).map((procedimentoId) => ({
            anamnese_id: anamnese.id,
            procedimento_id: procedimentoId,
          })),
        );

      if (contraindicacaoError) {
        setLoading(false);
        toast.error("Anamnese salva, mas as contraindicações falharam.");
        return;
      }
    }

    setLoading(false);
    toast.success("Anamnese registrada.");
    setRespostas(RESPOSTAS_VAZIAS);
    setTipoPele(null);
    setContraindicados(new Set());
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Nova anamnese
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova anamnese</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {CAMPOS.map((campo) => (
            <div key={campo.chave} className="flex flex-col gap-2">
              <Label htmlFor={campo.chave}>{campo.label}</Label>
              <Textarea
                id={campo.chave}
                value={respostas[campo.chave]}
                placeholder={campo.placeholder}
                onChange={(e) =>
                  setRespostas((prev) => ({
                    ...prev,
                    [campo.chave]: e.target.value,
                  }))
                }
              />
            </div>
          ))}

          <div className="flex flex-col gap-2">
            <Label>Tipo de pele (Fitzpatrick)</Label>
            <Select
              value={tipoPele ? String(tipoPele) : undefined}
              onValueChange={(v) => setTipoPele(v ? (Number(v) as TipoPele) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Não informado" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PELE.map((tipo) => (
                  <SelectItem key={tipo} value={String(tipo)}>
                    {TIPO_PELE_LABELS[tipo]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Contraindicado para</Label>
            {procedimentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum procedimento cadastrado.
              </p>
            ) : (
              <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-md border p-2">
                {procedimentos.map((procedimento) => (
                  <label
                    key={procedimento.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={contraindicados.has(procedimento.id)}
                      onChange={() => toggleContraindicado(procedimento.id)}
                      className="size-4 rounded border-input"
                    />
                    {procedimento.nome}
                  </label>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
