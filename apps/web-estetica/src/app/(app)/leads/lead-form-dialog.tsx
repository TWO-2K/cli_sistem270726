"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
import { Textarea } from "@empresa/ui/components/textarea";
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
} from "@empresa/ui/components/dialog";
import {
  ESTAGIOS_LEAD,
  ESTAGIO_LEAD_LABELS,
  type EstagioLead,
  type Lead,
  type Usuario,
} from "@/lib/types/db";

const SEM_RESPONSAVEL = "nenhum";

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  usuarios,
  origensSugeridas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead;
  usuarios: Usuario[];
  origensSugeridas: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState(lead?.nome ?? "");
  const [contato, setContato] = useState(lead?.contato ?? "");
  const [origem, setOrigem] = useState(lead?.origem ?? "");
  const [estagio, setEstagio] = useState<EstagioLead>(lead?.estagio ?? "novo");
  const [responsavelId, setResponsavelId] = useState(
    lead?.responsavel_id ?? SEM_RESPONSAVEL,
  );
  const [motivoPerda, setMotivoPerda] = useState(lead?.motivo_perda ?? "");
  const [observacoes, setObservacoes] = useState(lead?.observacoes ?? "");

  function resetParaCriacao() {
    setNome("");
    setContato("");
    setOrigem("");
    setEstagio("novo");
    setResponsavelId(SEM_RESPONSAVEL);
    setMotivoPerda("");
    setObservacoes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const payload = {
      nome,
      contato,
      origem: origem || null,
      estagio,
      responsavel_id: responsavelId === SEM_RESPONSAVEL ? null : responsavelId,
      motivo_perda: estagio === "perdido" ? motivoPerda || null : null,
      observacoes: observacoes || null,
    };

    const { error } = lead
      ? await supabase
          .from("leads")
          .update({ ...payload, atualizado_em: new Date().toISOString() })
          .eq("id", lead.id)
      : await supabase.from("leads").insert(payload);

    setLoading(false);

    if (error) {
      toast.error(
        lead ? "Não foi possível salvar o lead." : "Não foi possível criar o lead.",
      );
      return;
    }

    toast.success(lead ? "Lead atualizado." : "Lead criado.");
    if (!lead) resetParaCriacao();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lead-nome">Nome</Label>
            <Input
              id="lead-nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lead-contato">Contato</Label>
            <Input
              id="lead-contato"
              required
              placeholder="Telefone ou e-mail"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lead-origem">Origem</Label>
            <Input
              id="lead-origem"
              list="lead-origens-sugeridas"
              placeholder="Instagram, Google Ads, indicação..."
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
            />
            <datalist id="lead-origens-sugeridas">
              {origensSugeridas.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-estagio">Estágio</Label>
              <Select
                value={estagio}
                onValueChange={(v) => setEstagio(v as EstagioLead)}
              >
                <SelectTrigger id="lead-estagio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTAGIOS_LEAD.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTAGIO_LEAD_LABELS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-responsavel">Responsável</Label>
              <Select
                value={responsavelId}
                onValueChange={(v) => setResponsavelId(v ?? SEM_RESPONSAVEL)}
              >
                <SelectTrigger id="lead-responsavel">
                  <SelectValue placeholder="Sem responsável">
                    {(value: string) =>
                      usuarios.find((u) => u.id === value)?.nome ??
                      "Sem responsável"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_RESPONSAVEL}>Sem responsável</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {estagio === "perdido" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-motivo-perda">Motivo da perda</Label>
              <Input
                id="lead-motivo-perda"
                value={motivoPerda}
                onChange={(e) => setMotivoPerda(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="lead-observacoes">Observações</Label>
            <Textarea
              id="lead-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional"
            />
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
