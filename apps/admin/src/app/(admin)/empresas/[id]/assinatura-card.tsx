"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@empresa/ui/components/button";
import { Badge } from "@empresa/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";
import type { Empresa } from "@empresa/supabase/types";

export function AssinaturaCard({ empresa }: { empresa: Empresa }) {
  const [ativando, setAtivando] = useState(false);

  async function handleAtivarCobranca() {
    setAtivando(true);
    const res = await fetch(`/api/admin/empresas/${empresa.id}/assinatura`, {
      method: "POST",
    });
    const data = await res.json();
    setAtivando(false);

    if (!res.ok) {
      toast.error(data.error ?? "Não foi possível iniciar a cobrança.");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Assinatura</CardTitle>
        {empresa.stripe_subscription_id ? (
          <Badge variant={empresa.status === "ativa" ? "default" : "outline"}>
            {empresa.status === "ativa" ? "Assinatura ativa" : "Pagamento pendente"}
          </Badge>
        ) : (
          <Badge variant="outline">Sem assinatura</Badge>
        )}
      </CardHeader>
      <CardContent>
        {empresa.stripe_subscription_id ? (
          <p className="text-sm text-muted-foreground">
            Cobrança gerenciada via Stripe. Alterações de status são feitas
            automaticamente conforme o pagamento é confirmado ou falha.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Esta empresa ainda não tem uma assinatura ativa.
            </p>
            <Button disabled={ativando} onClick={handleAtivarCobranca}>
              {ativando ? "Aguarde..." : "Ativar cobrança"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
