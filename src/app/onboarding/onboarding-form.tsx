"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SEGMENTOS = ["Estética", "Odontologia", "Fisioterapia", "Outro"];

export function OnboardingForm({
  userId,
  userEmail,
  userNome,
}: {
  userId: string;
  userEmail: string;
  userNome: string;
}) {
  const router = useRouter();
  const [nomeClinica, setNomeClinica] = useState("");
  const [segmento, setSegmento] = useState(SEGMENTOS[0]);
  const [nomeUsuario, setNomeUsuario] = useState(userNome);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: clinica, error: clinicaError } = await supabase
      .from("clinicas")
      .insert({ nome: nomeClinica, segmento })
      .select("id")
      .single();

    if (clinicaError || !clinica) {
      setError("Não foi possível criar a clínica. Tente novamente.");
      setLoading(false);
      return;
    }

    const { error: usuarioError } = await supabase.from("usuarios").insert({
      id: userId,
      clinica_id: clinica.id,
      nome: nomeUsuario,
      email: userEmail,
      perfil: "admin",
    });

    if (usuarioError) {
      setError("Não foi possível concluir o cadastro. Tente novamente.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Cadastre sua clínica</CardTitle>
        <CardDescription>
          Leva menos de um minuto. Você poderá ajustar tudo depois em
          Configurações.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nomeClinica">Nome da clínica</Label>
            <Input
              id="nomeClinica"
              required
              value={nomeClinica}
              onChange={(e) => setNomeClinica(e.target.value)}
              placeholder="Ex: Espaço Estética Viva"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="segmento">Segmento</Label>
            <Select value={segmento} onValueChange={(value) => setSegmento(value ?? SEGMENTOS[0])}>
              <SelectTrigger id="segmento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTOS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nomeUsuario">Seu nome</Label>
            <Input
              id="nomeUsuario"
              required
              value={nomeUsuario}
              onChange={(e) => setNomeUsuario(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Criando..." : "Começar a usar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
