"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Badge } from "@empresa/ui/components/badge";
import { Button } from "@empresa/ui/components/button";
import {
  Card,
  CardContent,
} from "@empresa/ui/components/card";
import { Trash2 } from "lucide-react";
import type { ListaEspera, Paciente, Procedimento, Usuario } from "@/lib/types/db";
import { ListaEsperaFormDialog } from "./lista-espera-form-dialog";

const PERIODO_LABELS: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  qualquer: "Qualquer período",
};

function formatarData(dataIso: string) {
  return dataIso.split("-").reverse().join("/");
}

function statusBadge(item: ListaEspera) {
  if (item.status === "convertido") {
    return <Badge variant="secondary">Convertido</Badge>;
  }
  if (item.status === "cancelado") {
    return <Badge variant="outline">Cancelado</Badge>;
  }
  const ofertaAtiva =
    item.oferta_expira_em && new Date(item.oferta_expira_em).getTime() > Date.now();
  if (ofertaAtiva) {
    return (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
        Oferta enviada
      </Badge>
    );
  }
  return <Badge variant="outline">Aguardando</Badge>;
}

export function ListaEsperaTabela({
  listaEspera,
  pacientes,
  usuarios,
  procedimentos,
}: {
  listaEspera: ListaEspera[];
  pacientes: Paciente[];
  usuarios: Usuario[];
  procedimentos: Procedimento[];
}) {
  const router = useRouter();

  async function removerDaLista(id: string) {
    if (!window.confirm("Remover este paciente da lista de espera?")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("lista_espera")
      .update({ status: "cancelado" })
      .eq("id", id);

    if (error) {
      toast.error("Não foi possível remover da lista.");
      return;
    }

    toast.success("Removido da lista de espera.");
    router.refresh();
  }

  const pacienteNome = (id: string) => pacientes.find((p) => p.id === id)?.nome ?? "—";
  const profissionalNome = (id: string | null) =>
    id ? (usuarios.find((u) => u.id === id)?.nome ?? "—") : "Qualquer";
  const procedimentoNome = (id: string | null) =>
    id ? (procedimentos.find((p) => p.id === id)?.nome ?? "—") : "Qualquer";

  const ativos = listaEspera.filter((item) => item.status !== "cancelado");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ListaEsperaFormDialog
          pacientes={pacientes}
          usuarios={usuarios}
          procedimentos={procedimentos}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          {ativos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ninguém na lista de espera no momento.
            </p>
          )}
          {ativos.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-md border px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{pacienteNome(item.paciente_id)}</p>
                <p className="text-xs text-muted-foreground">
                  {profissionalNome(item.profissional_id)} ·{" "}
                  {procedimentoNome(item.procedimento_id)} ·{" "}
                  {formatarData(item.disponibilidade_inicio)} a{" "}
                  {formatarData(item.disponibilidade_fim)} ·{" "}
                  {PERIODO_LABELS[item.periodo_dia]}
                </p>
                {item.observacoes && (
                  <p className="text-xs text-muted-foreground">{item.observacoes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(item)}
                {item.status === "aguardando" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removerDaLista(item.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
