"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarPlus,
  Eye,
  LayoutGrid,
  List,
  Mail,
  Pencil,
  Phone,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { cn } from "@empresa/ui/utils";
import { iniciaisPaciente } from "@/lib/pacientes-utils";
import type { Paciente } from "@/lib/types/db";
import { EditarPacienteDialog } from "./[id]/editar-paciente-dialog";
import { NovoPacienteDialog } from "./novo-paciente-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui/components/table";

const VISUALIZACAO_STORAGE_KEY = "pacientes:visualizacao";

type Filtro = "todos" | "novos";
type Visualizacao = "lista" | "cards";

export type PacienteComStatus = Paciente & {
  temHistorico: boolean;
  emTratamento: boolean;
};

function statusDoPaciente(paciente: PacienteComStatus) {
  if (!paciente.temHistorico) return "novo";
  if (paciente.emTratamento) return "em_tratamento";
  return "sem_atividade";
}

export function PacientesTable({
  pacientes,
}: {
  pacientes: PacienteComStatus[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("lista");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  useEffect(() => {
    // Sincroniza com o localStorage (sistema externo) só após montar no
    // cliente, para não divergir da renderização inicial vinda do servidor.
    const salvo = localStorage.getItem(VISUALIZACAO_STORAGE_KEY);
    if (salvo === "lista" || salvo === "cards") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisualizacao(salvo);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(VISUALIZACAO_STORAGE_KEY, visualizacao);
  }, [visualizacao]);

  const filtrados = useMemo(() => {
    return pacientes
      .filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()))
      .filter((p) => (filtro === "novos" ? !p.temHistorico : true));
  }, [pacientes, busca, filtro]);

  async function excluirPaciente(id: string) {
    if (!window.confirm("Excluir este paciente? Essa ação não pode ser desfeita."))
      return;
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase.from("pacientes").delete().eq("id", id);
    setExcluindoId(null);
    if (error) {
      if (error.code === "23503") {
        toast.error(
          "Não é possível excluir: este paciente possui histórico (agendamentos, atendimentos, comandas etc.) vinculado.",
        );
        return;
      }
      toast.error("Não foi possível excluir o paciente.");
      return;
    }
    toast.success("Paciente excluído.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="h-9 pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
            {(
              [
                ["todos", "Todos"],
                ["novos", "Novos"],
              ] as [Filtro, string][]
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                  filtro === valor
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setVisualizacao("lista")}
              aria-label="Visualização em lista"
              className={cn(
                "rounded-md p-1.5 transition-colors",
                visualizacao === "lista"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setVisualizacao("cards")}
              aria-label="Visualização em cards"
              className={cn(
                "rounded-md p-1.5 transition-colors",
                visualizacao === "cards"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-card py-10 text-center text-muted-foreground">
          <Users className="h-6 w-6" />
          {pacientes.length === 0 ? (
            <>
              <p>Nenhum paciente cadastrado ainda.</p>
              <NovoPacienteDialog />
            </>
          ) : (
            <p>Nenhum paciente encontrado para essa busca.</p>
          )}
        </div>
      ) : (
        <>
        {visualizacao === "lista" && (
        <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((paciente) => {
                const status = statusDoPaciente(paciente);
                return (
                  <TableRow
                    key={paciente.id}
                    onClick={() => router.push(`/pacientes/${paciente.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <span className="flex items-center gap-3 font-medium">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                          {iniciaisPaciente(paciente.nome)}
                        </span>
                        {paciente.nome}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {paciente.telefone ?? "—"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {paciente.email ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          status === "novo" &&
                            "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
                          status === "em_tratamento" &&
                            "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
                          status === "sem_atividade" &&
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {status === "novo"
                          ? "Novo"
                          : status === "em_tratamento"
                            ? "Em tratamento"
                            : "Sem atividade"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(paciente.criado_em).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <EditarPacienteDialog
                          paciente={paciente}
                          renderTrigger={
                            <Button variant="ghost" size="icon-sm" />
                          }
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </EditarPacienteDialog>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          nativeButton={false}
                          render={<Link href="/agenda" />}
                        >
                          <CalendarPlus className="h-4 w-4" />
                          <span className="sr-only">Agendar</span>
                        </Button>
                        {!paciente.temHistorico && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={excluindoId === paciente.id}
                            onClick={() => excluirPaciente(paciente.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        )}
        <div
          className={cn(
            "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
            visualizacao === "lista" && "md:hidden",
          )}
        >
          {filtrados.map((paciente) => {
            const status = statusDoPaciente(paciente);
            return (
              <div
                key={paciente.id}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                    {iniciaisPaciente(paciente.nome)}
                  </span>
                  <Link
                    href={`/pacientes/${paciente.id}`}
                    className="font-medium hover:underline"
                  >
                    {paciente.nome}
                  </Link>
                </div>

                <span
                  className={cn(
                    "inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium",
                    status === "novo" &&
                      "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
                    status === "em_tratamento" &&
                      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
                    status === "sem_atividade" &&
                      "bg-muted text-muted-foreground",
                  )}
                >
                  {status === "novo"
                    ? "Novo"
                    : status === "em_tratamento"
                      ? "Em tratamento"
                      : "Sem atividade"}
                </span>

                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {paciente.telefone ?? "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {paciente.email ?? "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">
                    {new Date(paciente.criado_em).toLocaleDateString("pt-BR")}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      nativeButton={false}
                      render={<Link href={`/pacientes/${paciente.id}`} />}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver</span>
                    </Button>
                    <EditarPacienteDialog
                      paciente={paciente}
                      renderTrigger={<Button variant="ghost" size="icon-sm" />}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar</span>
                    </EditarPacienteDialog>
                    {!paciente.temHistorico && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={excluindoId === paciente.id}
                        onClick={() => excluirPaciente(paciente.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
