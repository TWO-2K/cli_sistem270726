"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });

    // Mensagem genérica sempre, para não revelar se o e-mail está cadastrado.
    setLoading(false);
    setEnviado(true);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Recuperar senha</CardTitle>
          <CardDescription>
            Informe seu e-mail para receber um link de redefinição de senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enviado ? (
            <p className="text-sm text-muted-foreground">
              Se houver uma conta com esse e-mail, você receberá um link para
              redefinir sua senha em instantes.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@clinica.com"
                />
              </div>
              <Button type="submit" disabled={loading} className="mt-2">
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="underline-offset-4 hover:underline"
            >
              Voltar para o login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
