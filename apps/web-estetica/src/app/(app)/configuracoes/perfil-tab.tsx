"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
import type { Empresa, HorarioDia } from "@/lib/types/db";
import { HorarioSemanaEditor } from "./horario-semana-editor";

export function PerfilTab({ empresa }: { empresa: Empresa }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState(empresa.nome);
  const [cnpj, setCnpj] = useState(empresa.cnpj ?? "");
  const [endereco, setEndereco] = useState(empresa.endereco ?? "");
  const [email, setEmail] = useState(empresa.email ?? "");
  const [horarios, setHorarios] = useState<HorarioDia[]>(
    empresa.horario_funcionamento,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("empresas")
      .update({
        nome,
        cnpj: cnpj || null,
        endereco: endereco || null,
        email: email || null,
        horario_funcionamento: horarios,
      })
      .eq("id", empresa.id);
    setLoading(false);

    if (error) {
      toast.error("Não foi possível salvar o perfil da empresa.");
      return;
    }

    toast.success("Perfil da empresa atualizado.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Dados gerais
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome fantasia</Label>
            <Input
              id="nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
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
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            Horário de funcionamento
          </h2>
          <p className="text-sm text-muted-foreground">
            Define a faixa de horário disponível na Agenda. Dias desativados
            não permitem agendamento.
          </p>
        </div>
        <HorarioSemanaEditor horarios={horarios} onChange={setHorarios} />
      </div>

      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
