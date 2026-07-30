import { createClient } from "@clinica/supabase/server";
import type { Clinica } from "@clinica/supabase/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@clinica/ui/components/card";
import { NovaClinicaDialog } from "./nova-clinica-dialog";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: clinicas } = await supabase
    .from("clinicas")
    .select("*")
    .order("criado_em", { ascending: false })
    .returns<Clinica[]>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clínicas</h1>
          <p className="text-muted-foreground">
            Crie uma clínica e o usuário admin responsável por ela.
          </p>
        </div>
        <NovaClinicaDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(clinicas ?? []).map((clinica) => (
          <Card key={clinica.id}>
            <CardHeader>
              <CardTitle className="text-base">{clinica.nome}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {clinica.segmento ?? "Segmento não informado"}
            </CardContent>
          </Card>
        ))}
        {(clinicas ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma clínica cadastrada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
