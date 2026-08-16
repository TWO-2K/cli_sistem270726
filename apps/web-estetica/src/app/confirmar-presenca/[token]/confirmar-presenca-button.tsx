"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@empresa/ui/components/button";

export function ConfirmarPresencaButton({
  token,
  statusInicial,
  resumo,
}: {
  token: string;
  statusInicial: string;
  resumo: { paciente: string; procedimento: string | null; dataHora: string };
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(statusInicial === "confirmado");
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setConfirmando(true);
    setErro(null);

    const resposta = await fetch("/api/confirmar-presenca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    setConfirmando(false);

    if (!resposta.ok) {
      const { error } = await resposta.json();
      setErro(error ?? "Não foi possível confirmar.");
      return;
    }

    setConfirmado(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <p className="font-medium">{resumo.paciente}</p>
        {resumo.procedimento && (
          <p className="text-muted-foreground">{resumo.procedimento}</p>
        )}
        <p className="text-muted-foreground">{resumo.dataHora}</p>
      </div>

      {confirmado ? (
        <p className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
          <CircleCheck className="size-4" />
          Presença confirmada!
        </p>
      ) : (
        <>
          <Button onClick={confirmar} disabled={confirmando}>
            {confirmando ? "Confirmando…" : "Confirmar presença"}
          </Button>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </>
      )}
    </div>
  );
}
