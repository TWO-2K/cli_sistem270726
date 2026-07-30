"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@empresa/ui/components/select";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@empresa/ui/components/dialog";
import { SEGMENTOS, SEGMENTO_LABELS, type Segmento } from "@empresa/supabase/types";

export function NovaEmpresaDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [senhaTemporaria, setSenhaTemporaria] = useState<string | null>(null);

  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [segmento, setSegmento] = useState<Segmento>("estetica");
  const [nomeAdmin, setNomeAdmin] = useState("");
  const [emailAdmin, setEmailAdmin] = useState("");

  function reset() {
    setNomeEmpresa("");
    setSegmento("estetica");
    setNomeAdmin("");
    setEmailAdmin("");
    setSenhaTemporaria(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomeEmpresa, segmento, nomeAdmin, emailAdmin }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Não foi possível criar a empresa.");
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
        Nova empresa
      </DialogTrigger>
      <DialogContent>
        {senhaTemporaria ? (
          <>
            <DialogHeader>
              <DialogTitle>Empresa criada</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Repasse estas credenciais ao admin da empresa. A senha só é
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
              <DialogTitle>Nova empresa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nomeEmpresa">Nome da empresa</Label>
                <Input
                  id="nomeEmpresa"
                  required
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="segmento">Segmento</Label>
                <Select
                  value={segmento}
                  onValueChange={(value) => setSegmento(value as Segmento)}
                >
                  <SelectTrigger id="segmento" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTOS.map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        {SEGMENTO_LABELS[slug]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Define qual sistema a empresa vai acessar.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nomeAdmin">Nome do admin da empresa</Label>
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
                  {loading ? "Criando..." : "Criar empresa"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
