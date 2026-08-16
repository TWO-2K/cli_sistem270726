import { createAdminClient } from "@empresa/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";
import { ConfirmarPresencaButton } from "./confirmar-presenca-button";

function formatarDataHora(dataHoraIso: string) {
  return new Date(dataHoraIso).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export default async function ConfirmarPresencaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: agendamento } = await admin
    .from("agendamentos")
    .select(
      "status, data_hora, pacientes(nome), procedimentos(nome), empresas(nome)",
    )
    .eq("token_confirmacao", token)
    .maybeSingle<{
      status: string;
      data_hora: string;
      pacientes: { nome: string } | null;
      procedimentos: { nome: string } | null;
      empresas: { nome: string } | null;
    }>();

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Confirmar presença</CardTitle>
          <CardDescription>
            {agendamento?.empresas?.nome ?? "Confirmação de agendamento"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!agendamento ? (
            <p className="text-sm text-muted-foreground">
              Link inválido ou expirado.
            </p>
          ) : (
            <ConfirmarPresencaButton
              token={token}
              statusInicial={agendamento.status}
              resumo={{
                paciente: agendamento.pacientes?.nome ?? "",
                procedimento: agendamento.procedimentos?.nome ?? null,
                dataHora: formatarDataHora(agendamento.data_hora),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
