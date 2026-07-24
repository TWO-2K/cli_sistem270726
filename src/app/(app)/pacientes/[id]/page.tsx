import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Atendimento,
  Evolucao,
  FotoAtendimento,
  Paciente,
} from "@/lib/types/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditarPacienteDialog } from "./editar-paciente-dialog";

export default async function PacienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .maybeSingle<Paciente>();

  if (!paciente) {
    notFound();
  }

  const [{ data: atendimentos }, { data: evolucoes }, { data: fotos }] =
    await Promise.all([
      supabase
        .from("atendimentos")
        .select("*")
        .eq("paciente_id", id)
        .order("criado_em", { ascending: false })
        .returns<Atendimento[]>(),
      supabase
        .from("evolucoes")
        .select("*")
        .eq("paciente_id", id)
        .order("criado_em", { ascending: false })
        .returns<Evolucao[]>(),
      supabase
        .from("fotos_atendimento")
        .select("*")
        .eq("paciente_id", id)
        .order("criado_em", { ascending: false })
        .returns<FotoAtendimento[]>(),
    ]);

  const fotosComUrl = await Promise.all(
    (fotos ?? []).map(async (foto) => {
      const { data } = await supabase.storage
        .from("fotos-atendimento")
        .createSignedUrl(foto.url, 3600);
      return { ...foto, signedUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {paciente.nome}
          </h1>
          <p className="text-muted-foreground">
            {paciente.telefone ?? "Sem telefone"} ·{" "}
            {paciente.email ?? "Sem e-mail"}
          </p>
          <p className="text-muted-foreground">
            {paciente.data_nascimento
              ? `Nascimento: ${paciente.data_nascimento
                  .split("-")
                  .reverse()
                  .join("/")}`
              : "Data de nascimento não informada"}
            {" · "}
            {paciente.endereco ?? "Endereço não informado"}
          </p>
        </div>
        <EditarPacienteDialog paciente={paciente} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Histórico de atendimentos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(atendimentos ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum atendimento registrado ainda.
            </p>
          )}
          {(atendimentos ?? []).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{new Date(a.criado_em).toLocaleString("pt-BR")}</span>
              <Badge variant={a.status === "concluido" ? "default" : "secondary"}>
                {a.status === "concluido" ? "Concluído" : "Em andamento"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(evolucoes ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma evolução registrada ainda.
            </p>
          )}
          {(evolucoes ?? []).map((e) => (
            <div key={e.id} className="rounded-md border px-3 py-2 text-sm">
              <p className="mb-1 text-xs text-muted-foreground">
                {new Date(e.criado_em).toLocaleString("pt-BR")}
              </p>
              <p>{e.texto}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fotos (antes/depois)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {fotosComUrl.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma foto registrada ainda.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fotosComUrl.map(
              (foto) =>
                foto.signedUrl && (
                  <a
                    key={foto.id}
                    href={foto.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative overflow-hidden rounded-md border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foto.signedUrl}
                      alt={`Foto ${foto.tipo} do atendimento`}
                      className="aspect-square w-full object-cover transition group-hover:opacity-80"
                    />
                    <Badge className="absolute bottom-1 left-1" variant="secondary">
                      {foto.tipo === "antes" ? "Antes" : "Depois"}
                    </Badge>
                  </a>
                ),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
