"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Clinica, HorarioDia } from "@/lib/types/db";

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function PerfilTab({ clinica }: { clinica: Clinica }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState(clinica.nome);
  const [cnpj, setCnpj] = useState(clinica.cnpj ?? "");
  const [endereco, setEndereco] = useState(clinica.endereco ?? "");
  const [email, setEmail] = useState(clinica.email ?? "");
  const [horarios, setHorarios] = useState<HorarioDia[]>(
    clinica.horario_funcionamento,
  );

  function atualizarDia(index: number, patch: Partial<HorarioDia>) {
    setHorarios((prev) =>
      prev.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("clinicas")
      .update({
        nome,
        cnpj: cnpj || null,
        endereco: endereco || null,
        email: email || null,
        horario_funcionamento: horarios,
      })
      .eq("id", clinica.id);
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
        <div className="rounded-lg border bg-background">
          {horarios.map((h, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-wrap items-center gap-4 border-b p-3 last:border-b-0",
                !h.ativo && "opacity-60",
              )}
            >
              <label className="flex w-40 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={h.ativo}
                  onChange={(e) =>
                    atualizarDia(i, { ativo: e.target.checked })
                  }
                />
                {DIAS_SEMANA[i]}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  disabled={!h.ativo}
                  value={h.inicio}
                  onChange={(e) => atualizarDia(i, { inicio: e.target.value })}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">até</span>
                <Input
                  type="time"
                  disabled={!h.ativo}
                  value={h.fim}
                  onChange={(e) => atualizarDia(i, { fim: e.target.value })}
                  className="w-32"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
