"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Badge } from "@empresa/ui/components/badge";
import { Button } from "@empresa/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@empresa/ui/components/select";
import { Tabs, TabsList, TabsTrigger } from "@empresa/ui/components/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui/components/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@empresa/ui/components/dropdown-menu";
import { MoreVertical } from "lucide-react";
import {
  ESTAGIOS_LEAD,
  ESTAGIO_LEAD_LABELS,
  type EstagioLead,
  type Lead,
  type Usuario,
} from "@/lib/types/db";
import { LeadFormDialog } from "./lead-form-dialog";

const ESTAGIO_COR: Record<EstagioLead, string> = {
  novo: "bg-muted-foreground",
  contatado: "bg-secondary",
  agendou: "bg-warning",
  convertido: "bg-success",
  perdido: "bg-muted-foreground/50",
};

function diasDesde(data: string) {
  const dias = Math.floor(
    (Date.now() - new Date(data).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (dias <= 0) return "hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function LeadsBoard({
  leads: leadsIniciais,
  usuarios,
}: {
  leads: Lead[];
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(leadsIniciais);
  const [leadsIniciaisAnterior, setLeadsIniciaisAnterior] =
    useState(leadsIniciais);
  if (leadsIniciais !== leadsIniciaisAnterior) {
    setLeadsIniciaisAnterior(leadsIniciais);
    setLeads(leadsIniciais);
  }

  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [filtroResponsavel, setFiltroResponsavel] = useState("todos");
  const [colunaSobrevoada, setColunaSobrevoada] = useState<EstagioLead | null>(
    null,
  );
  const [novoLeadAberto, setNovoLeadAberto] = useState(false);
  const [leadEditando, setLeadEditando] = useState<Lead | null>(null);

  const usuariosPorId = useMemo(
    () => new Map(usuarios.map((u) => [u.id, u])),
    [usuarios],
  );

  const origensSugeridas = useMemo(
    () =>
      Array.from(new Set(leads.map((l) => l.origem).filter(Boolean))) as string[],
    [leads],
  );

  const leadsFiltrados =
    filtroResponsavel === "todos"
      ? leads
      : leads.filter((l) => l.responsavel_id === filtroResponsavel);

  async function moverEstagio(leadId: string, estagio: EstagioLead) {
    const anterior = leads;
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, estagio } : l)),
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ estagio, atualizado_em: new Date().toISOString() })
      .eq("id", leadId);

    if (error) {
      setLeads(anterior);
      toast.error("Não foi possível mover o lead.");
      return;
    }
    router.refresh();
  }

  async function converterEmPaciente(lead: Lead) {
    const supabase = createClient();
    const { data: paciente, error: erroPaciente } = await supabase
      .from("pacientes")
      .insert({ nome: lead.nome, telefone: lead.contato })
      .select("id")
      .single();

    if (erroPaciente || !paciente) {
      toast.error("Não foi possível criar o paciente.");
      return;
    }

    const { error: erroLead } = await supabase
      .from("leads")
      .update({
        estagio: "convertido",
        paciente_id: paciente.id,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", lead.id);

    if (erroLead) {
      toast.error("Paciente criado, mas o lead não foi atualizado.");
      return;
    }

    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? { ...l, estagio: "convertido", paciente_id: paciente.id }
          : l,
      ),
    );
    toast.success("Lead convertido em paciente.");
    router.refresh();
  }

  function LeadCardMenu({ lead }: { lead: Lead }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreVertical className="size-4" />
          <span className="sr-only">Ações</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setLeadEditando(lead)}>
            Editar
          </DropdownMenuItem>
          {lead.estagio !== "convertido" && (
            <DropdownMenuItem onClick={() => converterEmPaciente(lead)}>
              Converter em paciente
            </DropdownMenuItem>
          )}
          {lead.estagio !== "perdido" && lead.estagio !== "convertido" && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => moverEstagio(lead.id, "perdido")}
            >
              Marcar como perdido
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function LeadCard({ lead }: { lead: Lead }) {
    const responsavel = lead.responsavel_id
      ? usuariosPorId.get(lead.responsavel_id)
      : null;

    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", lead.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className="cursor-grab rounded-xl border border-transparent bg-card p-3 shadow-sm hover:border-border active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{lead.nome}</p>
          <LeadCardMenu lead={lead} />
        </div>
        <p className="text-xs text-muted-foreground">{lead.contato}</p>
        <div className="mt-2 flex items-center justify-between">
          {lead.origem ? (
            <Badge variant="outline" className="text-[10px]">
              {lead.origem}
            </Badge>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {diasDesde(lead.atualizado_em)}
            </span>
            {responsavel && (
              <span
                title={responsavel.nome}
                className="flex size-5 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground"
              >
                {iniciais(responsavel.nome)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "kanban" | "lista")}
        >
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Select
            value={filtroResponsavel}
            onValueChange={(v) => setFiltroResponsavel(v ?? "todos")}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos responsáveis</SelectItem>
              {usuarios.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => setNovoLeadAberto(true)}>+ Novo lead</Button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex min-h-0 min-w-0 flex-1 gap-4 overflow-x-auto pb-2 contain-layout">
          {ESTAGIOS_LEAD.map((estagio) => {
            const leadsColuna = leadsFiltrados.filter(
              (l) => l.estagio === estagio,
            );
            return (
              <div
                key={estagio}
                onDragOver={(e) => {
                  e.preventDefault();
                  setColunaSobrevoada(estagio);
                }}
                onDragLeave={() => setColunaSobrevoada(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setColunaSobrevoada(null);
                  const leadId = e.dataTransfer.getData("text/plain");
                  if (leadId) moverEstagio(leadId, estagio);
                }}
                className={`flex h-full w-64 shrink-0 flex-col gap-2 rounded-2xl bg-muted p-3 transition-colors ${
                  colunaSobrevoada === estagio ? "bg-accent" : ""
                }`}
              >
                <div className="flex shrink-0 items-center justify-between px-1">
                  <span className="flex items-center gap-2 text-xs font-bold tracking-wide text-foreground uppercase">
                    <span
                      className={`size-2 rounded-full ${ESTAGIO_COR[estagio]}`}
                    />
                    {ESTAGIO_LEAD_LABELS[estagio]}
                  </span>
                  <span className="rounded-full bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                    {leadsColuna.length}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                  {leadsColuna.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                  {leadsColuna.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                      Arraste um lead aqui
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Parado há</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsFiltrados.map((lead) => {
                const responsavel = lead.responsavel_id
                  ? usuariosPorId.get(lead.responsavel_id)
                  : null;
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.nome}</TableCell>
                    <TableCell>{lead.contato}</TableCell>
                    <TableCell>{lead.origem ?? "—"}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <span
                          className={`size-2 rounded-full ${ESTAGIO_COR[lead.estagio]}`}
                        />
                        {ESTAGIO_LEAD_LABELS[lead.estagio]}
                      </span>
                    </TableCell>
                    <TableCell>{responsavel?.nome ?? "—"}</TableCell>
                    <TableCell>{diasDesde(lead.atualizado_em)}</TableCell>
                    <TableCell>
                      <LeadCardMenu lead={lead} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {leadsFiltrados.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <LeadFormDialog
        open={novoLeadAberto}
        onOpenChange={setNovoLeadAberto}
        usuarios={usuarios}
        origensSugeridas={origensSugeridas}
      />
      {leadEditando && (
        <LeadFormDialog
          open={!!leadEditando}
          onOpenChange={(open) => !open && setLeadEditando(null)}
          lead={leadEditando}
          usuarios={usuarios}
          origensSugeridas={origensSugeridas}
        />
      )}
    </div>
  );
}
