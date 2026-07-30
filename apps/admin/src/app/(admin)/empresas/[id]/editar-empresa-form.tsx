"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
import { Badge } from "@empresa/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";
import { EMPRESA_STATUS_LABELS, type Empresa } from "@empresa/supabase/types";

export function EditarEmpresaForm({ empresa }: { empresa: Empresa }) {
  const router = useRouter();
  const [nome, setNome] = useState(empresa.nome);
  const [cnpj, setCnpj] = useState(empresa.cnpj ?? "");
  const [endereco, setEndereco] = useState(empresa.endereco ?? "");
  const [email, setEmail] = useState(empresa.email ?? "");
  const [status, setStatus] = useState(empresa.status);
  const [loading, setLoading] = useState(false);
  const [alternandoStatus, setAlternandoStatus] = useState(false);

  async function salvar(novoStatus = status) {
    const res = await fetch(`/api/admin/empresas/${empresa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        cnpj: cnpj || null,
        endereco: endereco || null,
        email: email || null,
        status: novoStatus,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Não foi possível salvar a empresa.");
      return false;
    }

    setStatus(novoStatus);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const ok = await salvar();
    setLoading(false);
    if (ok) {
      toast.success("Empresa atualizada.");
      router.refresh();
    }
  }

  async function handleToggleStatus() {
    setAlternandoStatus(true);
    const novoStatus = status === "ativa" ? "suspensa" : "ativa";
    const ok = await salvar(novoStatus);
    setAlternandoStatus(false);
    if (ok) {
      toast.success(
        novoStatus === "suspensa" ? "Empresa suspensa." : "Empresa reativada.",
      );
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Dados da empresa</CardTitle>
        <Badge variant={status === "ativa" ? "default" : "outline"}>
          {EMPRESA_STATUS_LABELS[status]}
        </Badge>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={alternandoStatus}
              onClick={handleToggleStatus}
            >
              {alternandoStatus
                ? "Aguarde..."
                : status === "ativa"
                  ? "Suspender empresa"
                  : "Reativar empresa"}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
