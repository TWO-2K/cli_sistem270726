"use client";

import { useState } from "react";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
import { ShieldPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@empresa/ui/components/dialog";

export function NovoSuperAdminDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [senhaTemporaria, setSenhaTemporaria] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  function reset() {
    setNome("");
    setEmail("");
    setSenhaTemporaria(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/super-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Não foi possível criar o super admin.");
      return;
    }

    setSenhaTemporaria(data.senhaTemporaria);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <ShieldPlus className="h-4 w-4" />
        Novo super admin
      </DialogTrigger>
      <DialogContent>
        {senhaTemporaria ? (
          <>
            <DialogHeader>
              <DialogTitle>Super admin criado</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Repasse estas credenciais à pessoa. A senha só é exibida uma
              vez.
            </p>
            <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3 text-sm">
              <p>
                <span className="font-medium">E-mail:</span> {email}
              </p>
              <p>
                <span className="font-medium">Senha temporária:</span>{" "}
                <code className="rounded bg-background px-1.5 py-0.5">
                  {senhaTemporaria}
                </code>
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Concluir
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Novo super admin</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Não pertence a nenhuma empresa — tem acesso total ao painel
              admin.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nomeSuperAdmin">Nome</Label>
                <Input
                  id="nomeSuperAdmin"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="emailSuperAdmin">E-mail</Label>
                <Input
                  id="emailSuperAdmin"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Criando..." : "Criar super admin"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
