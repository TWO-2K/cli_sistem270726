"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Label } from "@empresa/ui/components/label";
import { Textarea } from "@empresa/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@empresa/ui/components/dialog";
import type { PacoteSessao, PlanoTratamentoEtapa, Procedimento } from "@/lib/types/db";

export function ConcluirAtendimentoDialog({
  atendimentoId,
  pacienteId,
  procedimento,
  agendamentoId,
}: {
  atendimentoId: string;
  pacienteId: string;
  procedimento: Procedimento | null;
  agendamentoId?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState("");
  const [pacoteAtivo, setPacoteAtivo] = useState<PacoteSessao | null>(null);
  const [abaterSessao, setAbaterSessao] = useState(true);
  const [etapaPlano, setEtapaPlano] = useState<PlanoTratamentoEtapa | null>(null);
  const [concluirEtapaPlano, setConcluirEtapaPlano] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!procedimento) {
        setPacoteAtivo(null);
        setEtapaPlano(null);
        return;
      }
      const supabase = createClient();
      const [{ data: pacotes }, { data: etapas }] = await Promise.all([
        supabase
          .from("pacotes_sessao")
          .select("*")
          .eq("paciente_id", pacienteId)
          .eq("procedimento_id", procedimento.id)
          .order("criado_em", { ascending: true })
          .returns<PacoteSessao[]>(),
        supabase
          .from("plano_tratamento_etapas")
          .select("*, planos_tratamento!inner(paciente_id, status)")
          .eq("procedimento_id", procedimento.id)
          .eq("status", "pendente")
          .eq("planos_tratamento.paciente_id", pacienteId)
          .eq("planos_tratamento.status", "ativo")
          .order("ordem", { ascending: true })
          .returns<PlanoTratamentoEtapa[]>(),
      ]);
      if (cancelado) return;
      const ativo = (pacotes ?? []).find((p) => p.sessoes_utilizadas < p.sessoes_total);
      setPacoteAtivo(ativo ?? null);
      setAbaterSessao(true);
      setEtapaPlano((etapas ?? [])[0] ?? null);
      setConcluirEtapaPlano(true);
    })();
    return () => {
      cancelado = true;
    };
  }, [pacienteId, procedimento]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    if (texto.trim()) {
      const { error: evolucaoError } = await supabase.from("evolucoes").insert({
        atendimento_id: atendimentoId,
        paciente_id: pacienteId,
        texto: texto.trim(),
      });
      if (evolucaoError) {
        toast.error("Não foi possível salvar a evolução.");
        setLoading(false);
        return;
      }
    }

    const { error: atendimentoError } = await supabase
      .from("atendimentos")
      .update({ status: "concluido" })
      .eq("id", atendimentoId);

    if (atendimentoError) {
      toast.error("Não foi possível concluir o atendimento.");
      setLoading(false);
      return;
    }

    const usaPacote = !!pacoteAtivo && abaterSessao;

    if (usaPacote) {
      const { error: abateError } = await supabase.rpc("abater_sessao_pacote", {
        p_pacote_id: pacoteAtivo!.id,
        p_atendimento_id: atendimentoId,
      });
      if (abateError) {
        toast.error("Não foi possível abater a sessão do pacote.");
        setLoading(false);
        return;
      }
    }

    const { data: comanda, error: comandaError } = await supabase
      .from("comandas")
      .insert({
        atendimento_id: atendimentoId,
        paciente_id: pacienteId,
        total: usaPacote ? 0 : (procedimento?.preco ?? 0),
      })
      .select("id")
      .single();

    if (!comandaError && comanda && procedimento) {
      await supabase.from("comanda_itens").insert({
        comanda_id: comanda.id,
        procedimento_id: procedimento.id,
        descricao: usaPacote
          ? `Sessão de pacote — ${procedimento.nome}`
          : procedimento.nome,
        quantidade: 1,
        valor_unitario: usaPacote ? 0 : procedimento.preco,
      });
    }

    if (agendamentoId) {
      await supabase
        .from("agendamentos")
        .update({ status: "concluido" })
        .eq("id", agendamentoId);
    }

    if (etapaPlano && concluirEtapaPlano) {
      await supabase
        .from("plano_tratamento_etapas")
        .update({ status: "concluida", atendimento_id: atendimentoId })
        .eq("id", etapaPlano.id);
    }

    setLoading(false);
    toast.success(
      usaPacote
        ? "Atendimento concluído e sessão abatida do pacote."
        : "Atendimento concluído e comanda gerada.",
    );
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Concluir
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir atendimento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="evolucao">Evolução (opcional)</Label>
            <Textarea
              id="evolucao"
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Observações sobre o atendimento..."
            />
          </div>
          {etapaPlano && (
            <label className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={concluirEtapaPlano}
                onChange={(e) => setConcluirEtapaPlano(e.target.checked)}
                className="mt-0.5 size-4 rounded border-input"
              />
              <span>
                Marcar etapa do plano de tratamento como concluída (
                {etapaPlano.descricao}).
              </span>
            </label>
          )}
          {pacoteAtivo ? (
            <label className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={abaterSessao}
                onChange={(e) => setAbaterSessao(e.target.checked)}
                className="mt-0.5 size-4 rounded border-input"
              />
              <span>
                Abater sessão do pacote (
                {pacoteAtivo.sessoes_total - pacoteAtivo.sessoes_utilizadas}{" "}
                restantes). A comanda será gerada sem cobrança, já paga na
                venda do pacote.
              </span>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ao concluir, uma comanda será gerada automaticamente para
              fechamento no Financeiro.
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Concluir e gerar comanda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
