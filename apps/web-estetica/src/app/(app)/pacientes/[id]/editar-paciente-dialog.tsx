"use client";

import { useState, type ReactElement, type ReactNode } from "react";
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
import type { Convenio, Paciente } from "@/lib/types/db";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@empresa/ui/components/dialog";

export function EditarPacienteDialog({
  paciente,
  convenios = [],
  renderTrigger,
  children = "Editar",
}: {
  paciente: Paciente;
  convenios?: Convenio[];
  renderTrigger?: ReactElement;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={renderTrigger ?? <Button variant="outline" size="sm" />}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar paciente</DialogTitle>
        </DialogHeader>
        <EditarPacienteForm
          key={paciente.id}
          paciente={paciente}
          convenios={convenios}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditarPacienteForm({
  paciente,
  convenios,
  onSaved,
}: {
  paciente: Paciente;
  convenios: Convenio[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState(paciente.nome);
  const [telefone, setTelefone] = useState(paciente.telefone ?? "");
  const [email, setEmail] = useState(paciente.email ?? "");
  const [dataNascimento, setDataNascimento] = useState(
    paciente.data_nascimento ?? "",
  );
  const [endereco, setEndereco] = useState(paciente.endereco ?? "");
  const [convenioId, setConvenioId] = useState<string | null>(
    paciente.convenio_id,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("pacientes")
      .update({
        nome,
        telefone: telefone || null,
        email: email || null,
        data_nascimento: dataNascimento || null,
        endereco: endereco || null,
        convenio_id: convenioId,
      })
      .eq("id", paciente.id);

    setLoading(false);

    if (error) {
      toast.error("Não foi possível atualizar o paciente.");
      return;
    }

    toast.success("Paciente atualizado.");
    onSaved();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="data_nascimento">Data de nascimento</Label>
        <Input
          id="data_nascimento"
          type="date"
          value={dataNascimento}
          onChange={(e) => setDataNascimento(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Input
          id="endereco"
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="Opcional"
        />
      </div>
      {convenios.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="convenio">Convênio</Label>
          <Select
            value={convenioId ?? "__none__"}
            onValueChange={(v) =>
              setConvenioId(v === "__none__" ? null : (v ?? null))
            }
          >
            <SelectTrigger id="convenio">
              <SelectValue placeholder="Nenhum">
                {(value: string) =>
                  convenios.find((c) => c.id === value)?.nome ?? "Nenhum"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {convenios.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
