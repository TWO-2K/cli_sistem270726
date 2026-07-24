"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Perfil, Usuario } from "@/lib/types/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PERFIS: { value: Perfil; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "recepcao", label: "Recepção" },
  { value: "profissional", label: "Profissional" },
  { value: "financeiro", label: "Financeiro" },
];

function perfilLabel(perfil: Perfil) {
  return PERFIS.find((p) => p.value === perfil)?.label ?? perfil;
}

export function UsuariosTab({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("recepcao");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credencial, setCredencial] = useState<{
    email: string;
    senha: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCredencial(null);

    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, perfil }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Não foi possível cadastrar o usuário.");
      return;
    }

    setCredencial({ email, senha: data.senhaTemporaria });
    setNome("");
    setEmail("");
    setPerfil("recepcao");
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nome</label>
          <Input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">E-mail</label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Perfil</label>
          <Select
            value={perfil}
            onValueChange={(value) => setPerfil((value as Perfil) ?? "recepcao")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERFIS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Adicionar"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {credencial && (
        <div className="flex flex-col gap-1 rounded-md border bg-muted/40 p-3 text-sm">
          <p>Usuário criado. Repasse a senha abaixo — ela só aparece uma vez.</p>
          <p>
            <span className="font-medium">E-mail:</span> {credencial.email}
          </p>
          <p>
            <span className="font-medium">Senha temporária:</span>{" "}
            <code className="rounded bg-background px-1.5 py-0.5">
              {credencial.senha}
            </code>
          </p>
        </div>
      )}

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{perfilLabel(u.perfil)}</TableCell>
              </TableRow>
            ))}
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
