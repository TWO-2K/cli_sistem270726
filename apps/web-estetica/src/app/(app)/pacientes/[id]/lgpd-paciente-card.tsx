"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";
import { Button } from "@empresa/ui/components/button";

export function LgpdPacienteCard({
  pacienteId,
  pacienteNome,
}: {
  pacienteId: string;
  pacienteNome: string;
}) {
  const router = useRouter();
  const [exportando, setExportando] = useState(false);
  const [anonimizando, setAnonimizando] = useState(false);

  async function exportarDados() {
    setExportando(true);
    const supabase = createClient();

    const { data, error } = await supabase.rpc("exportar_dados_paciente", {
      p_paciente_id: pacienteId,
    });

    setExportando(false);

    if (error) {
      toast.error("Não foi possível exportar os dados do paciente.");
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dados-paciente-${pacienteNome.replace(/\s+/g, "-").toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Dados exportados.");
  }

  async function anonimizarDados() {
    const confirmado = window.confirm(
      `Anonimizar os dados de "${pacienteNome}"? Nome, telefone, email, endereço, ` +
        "data de nascimento, anamneses e evoluções serão removidos permanentemente, " +
        "e as fotos de atendimento serão apagadas. Registros financeiros (comandas, " +
        "pagamentos) são mantidos sem vínculo com uma pessoa identificável, por " +
        "exigência de guarda fiscal. Essa ação não pode ser desfeita.",
    );
    if (!confirmado) return;

    setAnonimizando(true);
    const supabase = createClient();

    const { data: fotos } = await supabase
      .from("fotos_atendimento")
      .select("url")
      .eq("paciente_id", pacienteId);

    const { error } = await supabase.rpc("anonimizar_paciente", {
      p_paciente_id: pacienteId,
    });

    if (error) {
      setAnonimizando(false);
      toast.error(error.message || "Não foi possível anonimizar o paciente.");
      return;
    }

    if (fotos && fotos.length > 0) {
      await supabase.storage
        .from("fotos-atendimento")
        .remove(fotos.map((f) => f.url));
    }

    toast.success("Dados do paciente anonimizados.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">LGPD</CardTitle>
        <CardDescription>
          Exportação completa dos dados do paciente e anonimização sob pedido do
          titular.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={exportarDados} disabled={exportando}>
          <Download className="size-4" />
          {exportando ? "Exportando…" : "Exportar dados (JSON)"}
        </Button>
        <Button
          variant="destructive"
          onClick={anonimizarDados}
          disabled={anonimizando}
        >
          <ShieldAlert className="size-4" />
          {anonimizando ? "Anonimizando…" : "Anonimizar dados do paciente"}
        </Button>
      </CardContent>
    </Card>
  );
}
