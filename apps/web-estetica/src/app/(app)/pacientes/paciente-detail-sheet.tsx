"use client";

import Link from "next/link";
import { CalendarPlus, Mail, Phone, Pencil } from "lucide-react";
import { Button } from "@empresa/ui/components/button";
import { cn } from "@empresa/ui/utils";
import { iniciaisPaciente } from "@/lib/pacientes-utils";
import type { Convenio } from "@/lib/types/db";
import { EditarPacienteDialog } from "./[id]/editar-paciente-dialog";
import { statusDoPaciente, type PacienteComStatus } from "./pacientes-table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@empresa/ui/components/sheet";

export function PacienteDetailSheet({
  paciente,
  convenios = [],
  onOpenChange,
}: {
  paciente: PacienteComStatus | null;
  convenios?: Convenio[];
  onOpenChange: (open: boolean) => void;
}) {
  const status = paciente ? statusDoPaciente(paciente) : null;

  return (
    <Sheet open={paciente !== null} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        {paciente && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                  {iniciaisPaciente(paciente.nome)}
                </span>
                <div className="flex flex-col gap-1">
                  <SheetTitle>{paciente.nome}</SheetTitle>
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
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4">
              <div className="flex flex-col gap-2 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {paciente.telefone ?? "—"}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {paciente.email ?? "—"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    Nascimento
                  </span>
                  <span>
                    {paciente.data_nascimento
                      ? new Date(
                          paciente.data_nascimento,
                        ).toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    Cadastro
                  </span>
                  <span>
                    {new Date(paciente.criado_em).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    Endereço
                  </span>
                  <span>{paciente.endereco ?? "—"}</span>
                </div>
              </div>

              <Link
                href={`/pacientes/${paciente.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver ficha completa →
              </Link>
            </div>

            <SheetFooter className="flex-row justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/agenda" />}
              >
                <CalendarPlus className="h-4 w-4" />
                Agendar
              </Button>
              <EditarPacienteDialog
                paciente={paciente}
                convenios={convenios}
                renderTrigger={<Button variant="outline" size="sm" />}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </EditarPacienteDialog>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
