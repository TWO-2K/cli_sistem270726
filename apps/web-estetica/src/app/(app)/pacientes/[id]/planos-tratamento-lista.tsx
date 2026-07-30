"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Badge } from "@empresa/ui/components/badge";
import { Button } from "@empresa/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";
import { cn } from "@empresa/ui/utils";
import type { PlanoTratamento, PlanoTratamentoEtapa, Procedimento } from "@/lib/types/db";

export function PlanosTratamentoLista({
  planos,
  etapas,
  procedimentos,
}: {
  planos: PlanoTratamento[];
  etapas: PlanoTratamentoEtapa[];
  procedimentos: Procedimento[];
}) {
  const router = useRouter();
  const [loadingEtapaId, setLoadingEtapaId] = useState<string | null>(null);

  const procedimentoNomePorId = useMemo(
    () => new Map(procedimentos.map((p) => [p.id, p.nome])),
    [procedimentos],
  );

  const etapasPorPlano = useMemo(() => {
    const map = new Map<string, PlanoTratamentoEtapa[]>();
    etapas.forEach((etapa) => {
      const lista = map.get(etapa.plano_id) ?? [];
      lista.push(etapa);
      map.set(etapa.plano_id, lista);
    });
    map.forEach((lista) => lista.sort((a, b) => a.ordem - b.ordem));
    return map;
  }, [etapas]);

  async function marcarConcluida(etapaId: string) {
    setLoadingEtapaId(etapaId);
    const supabase = createClient();

    const { error } = await supabase
      .from("plano_tratamento_etapas")
      .update({ status: "concluida" })
      .eq("id", etapaId);

    setLoadingEtapaId(null);

    if (error) {
      toast.error("Não foi possível marcar a etapa como concluída.");
      return;
    }

    toast.success("Etapa concluída.");
    router.refresh();
  }

  if (planos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum plano de tratamento criado para este paciente ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {planos.map((plano) => {
        const etapasDoPlano = etapasPorPlano.get(plano.id) ?? [];
        const concluidas = etapasDoPlano.filter((e) => e.status === "concluida").length;
        const total = etapasDoPlano.length;
        return (
          <Card key={plano.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{plano.titulo}</CardTitle>
              <Badge variant={concluidas === total && total > 0 ? "secondary" : "default"}>
                {concluidas}/{total} etapas
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {etapasDoPlano.map((etapa) => (
                <div
                  key={etapa.id}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                    etapa.status === "concluida" && "border-green-500/30 bg-green-500/5",
                  )}
                >
                  <div>
                    <p className={cn(etapa.status === "concluida" && "line-through")}>
                      {etapa.descricao}
                      {etapa.procedimento_id &&
                        procedimentoNomePorId.has(etapa.procedimento_id) &&
                        ` — ${procedimentoNomePorId.get(etapa.procedimento_id)}`}
                    </p>
                  </div>
                  {etapa.status === "concluida" ? (
                    <Badge variant="secondary">Concluída</Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={loadingEtapaId === etapa.id}
                      onClick={() => marcarConcluida(etapa.id)}
                    >
                      Marcar concluída
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
