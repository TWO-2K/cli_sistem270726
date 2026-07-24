"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NovaClinicaDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [senhaTemporaria, setSenhaTemporaria] = useState<string | null>(null);

  const [nomeClinica, setNomeClinica] = useState("");
  const [segmento, setSegmento] = useState("");
  const [nomeAdmin, setNomeAdmin] = useState("");
  const [emailAdmin, setEmailAdmin] = useState("");

  function reset() {
    setNomeClinica("");
    setSegmento("");
    setNomeAdmin("");
    setEmailAdmin("");
    setSenhaTemporaria(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/clinicas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomeClinica, segmento, nomeAdmin, emailAdmin }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Não foi possível criar a clínica.");
      return;
    }

    setSenhaTemporaria(data.senhaTemporaria);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Nova clínica
      </DialogTrigger>
      <DialogContent>
        {senhaTemporaria ? (
          <>
            <DialogHeader>
              <DialogTitle>Clínica criada</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Repasse estas credenciais ao admin da clínica. A senha só é
              exibida uma vez.
            </p>
            <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3 text-sm">
              <p>
                <span className="font-medium">E-mail:</span> {emailAdmin}
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
              <DialogTitle>Nova clínica</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nomeClinica">Nome da clínica</Label>
                <Input
                  id="nomeClinica"
                  required
                  value={nomeClinica}
                  onChange={(e) => setNomeClinica(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="segmento">Segmento</Label>
                <Input
                  id="segmento"
                  placeholder="Ex: Estética"
                  value={segmento}
                  onChange={(e) => setSegmento(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nomeAdmin">Nome do admin da clínica</Label>
                <Input
                  id="nomeAdmin"
                  required
                  value={nomeAdmin}
                  onChange={(e) => setNomeAdmin(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="emailAdmin">E-mail do admin</Label>
                <Input
                  id="emailAdmin"
                  type="email"
                  required
                  value={emailAdmin}
                  onChange={(e) => setEmailAdmin(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Criando..." : "Criar clínica"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
