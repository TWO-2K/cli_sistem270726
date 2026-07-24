"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MudarSenhaForm({ destino }: { destino: string }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha !== confirmacao) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.updateUser({ password: senha });

    if (authError || !authData.user) {
      setError("Não foi possível atualizar a senha. Tente novamente.");
      setLoading(false);
      return;
    }

    const { error: usuarioError } = await supabase
      .from("usuarios")
      .update({ must_change_password: false })
      .eq("id", authData.user.id);

    setLoading(false);

    if (usuarioError) {
      setError("Senha atualizada, mas houve um erro ao concluir. Tente entrar novamente.");
      return;
    }

    router.push(destino);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Defina sua senha</CardTitle>
        <CardDescription>
          Este é seu primeiro acesso. Escolha uma nova senha para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmacao">Confirmar senha</Label>
            <Input
              id="confirmacao"
              type="password"
              required
              minLength={6}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Salvando..." : "Salvar e continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
