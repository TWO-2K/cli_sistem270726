"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@empresa/ui/components/button";

export function ReservarHorarioButton({
  token,
  resumo,
}: {
  token: string;
  resumo: {
    paciente: string;
    procedimento: string | null;
    profissional: string | null;
    dataHora: string;
  };
}) {
  const [reservando, setReservando] = useState(false);
  const [reservado, setReservado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function reservar() {
    setReservando(true);
    setErro(null);

    const resposta = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/aceitar-oferta-fila-espera`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      },
    );

    setReservando(false);

    if (!resposta.ok) {
      const { error } = await resposta.json();
      setErro(
        resposta.status === 409
          ? "Esse horário já foi preenchido por outra pessoa."
          : (error ?? "Não foi possível reservar."),
      );
      return;
    }

    setReservado(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <p className="font-medium">{resumo.paciente}</p>
        {resumo.procedimento && (
          <p className="text-muted-foreground">{resumo.procedimento}</p>
        )}
        {resumo.profissional && (
          <p className="text-muted-foreground">com {resumo.profissional}</p>
        )}
        <p className="text-muted-foreground">{resumo.dataHora}</p>
      </div>

      {reservado ? (
        <p className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
          <CircleCheck className="size-4" />
          Horário reservado!
        </p>
      ) : (
        <>
          <Button onClick={reservar} disabled={reservando}>
            {reservando ? "Reservando…" : "Reservar este horário"}
          </Button>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </>
      )}
    </div>
  );
}
