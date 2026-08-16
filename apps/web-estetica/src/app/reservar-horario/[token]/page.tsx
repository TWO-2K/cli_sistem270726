import { createAdminClient } from "@empresa/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";
import { ReservarHorarioButton } from "./reservar-horario-button";

function formatarDataHora(dataHoraIso: string) {
  return new Date(dataHoraIso).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export default async function ReservarHorarioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: fila } = await admin
    .from("lista_espera")
    .select(
      "status, oferta_expira_em, oferta_agendamento_id, pacientes(nome), agendamentos!lista_espera_oferta_agendamento_id_fkey(data_hora, usuarios(nome), procedimentos(nome))",
    )
    .eq("oferta_token", token)
    .maybeSingle<{
      status: string;
      oferta_expira_em: string | null;
      oferta_agendamento_id: string | null;
      pacientes: { nome: string } | null;
      agendamentos: {
        data_hora: string;
        usuarios: { nome: string } | null;
        procedimentos: { nome: string } | null;
      } | null;
    }>();

  // Server Component: roda uma vez por request, não é re-render de cliente.
  // eslint-disable-next-line react-hooks/purity
  const agora = Date.now();
  const expirada = !fila?.oferta_expira_em || new Date(fila.oferta_expira_em).getTime() < agora;
  const disponivel = fila && fila.status === "aguardando" && !expirada && fila.agendamentos;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Reservar horário</CardTitle>
          <CardDescription>Vaga liberada na fila de espera</CardDescription>
        </CardHeader>
        <CardContent>
          {!fila ? (
            <p className="text-sm text-muted-foreground">Link inválido.</p>
          ) : fila.status === "convertido" ? (
            <p className="text-sm text-muted-foreground">
              Este horário já foi reservado.
            </p>
          ) : !disponivel ? (
            <p className="text-sm text-muted-foreground">
              Esta oferta expirou. Fique tranquilo, assim que outro horário
              compatível abrir você será avisado de novo.
            </p>
          ) : (
            <ReservarHorarioButton
              token={token}
              resumo={{
                paciente: fila.pacientes?.nome ?? "",
                procedimento: fila.agendamentos?.procedimentos?.nome ?? null,
                profissional: fila.agendamentos?.usuarios?.nome ?? null,
                dataHora: formatarDataHora(fila.agendamentos!.data_hora),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
