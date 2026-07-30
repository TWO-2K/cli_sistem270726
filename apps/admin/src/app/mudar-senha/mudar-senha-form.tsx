"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";

export function MudarSenhaForm({
  destino,
  titulo = "Defina sua senha",
  descricao = "Este é seu primeiro acesso. Escolha uma nova senha para continuar.",
}: {
  destino: string;
  titulo?: string;
  descricao?: string;
}) {
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
        <CardTitle className="text-xl">{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
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
