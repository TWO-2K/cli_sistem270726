"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
import type { Perfil, Usuario } from "@empresa/supabase/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@empresa/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@empresa/ui/components/dialog";
import { Badge } from "@empresa/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@empresa/ui/components/card";

const PERFIS: { value: Perfil; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "recepcao", label: "Recepção" },
  { value: "profissional", label: "Profissional" },
  { value: "financeiro", label: "Financeiro" },
];

function perfilLabel(perfil: Perfil) {
  return PERFIS.find((p) => p.value === perfil)?.label ?? perfil;
}

export function UsuariosDaEmpresa({
  empresaId,
  usuarios,
}: {
  empresaId: string;
  usuarios: Usuario[];
}) {
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
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [alternandoId, setAlternandoId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCredencial(null);

    const res = await fetch(`/api/admin/empresas/${empresaId}/usuarios`, {
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

  async function handleToggleAtivo(usuario: Usuario) {
    setAlternandoId(usuario.id);
    const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: usuario.nome,
        perfil: usuario.perfil,
        ativo: !usuario.ativo,
      }),
    });
    setAlternandoId(null);

    if (!res.ok) {
      toast.error("Não foi possível atualizar o usuário.");
      return;
    }

    toast.success(usuario.ativo ? "Usuário desativado." : "Usuário reativado.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usuários</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label>Nome</Label>
            <Input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-56"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>E-mail</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-56"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Perfil</Label>
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

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{perfilLabel(u.perfil)}</TableCell>
                  <TableCell>
                    <Badge variant={u.ativo ? "default" : "outline"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditando(u)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={alternandoId === u.id}
                      onClick={() => handleToggleAtivo(u)}
                    >
                      {alternandoId === u.id
                        ? "Aguarde..."
                        : u.ativo
                          ? "Desativar"
                          : "Reativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {usuarios.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <EditarUsuarioDialog
        usuario={editando}
        onClose={() => setEditando(null)}
        onSaved={() => {
          setEditando(null);
          router.refresh();
        }}
      />
    </Card>
  );
}

function EditarUsuarioDialog({
  usuario,
  onClose,
  onSaved,
}: {
  usuario: Usuario | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog
      open={usuario !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
        </DialogHeader>
        {usuario && (
          <EditarUsuarioForm key={usuario.id} usuario={usuario} onSaved={onSaved} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditarUsuarioForm({
  usuario,
  onSaved,
}: {
  usuario: Usuario;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(usuario.nome);
  const [perfil, setPerfil] = useState<Perfil>(usuario.perfil);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, perfil, ativo: usuario.ativo }),
    });

    setLoading(false);

    if (!res.ok) {
      toast.error("Não foi possível atualizar o usuário.");
      return;
    }

    toast.success("Usuário atualizado.");
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Nome</Label>
        <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Perfil</Label>
        <Select
          value={perfil}
          onValueChange={(value) => setPerfil((value as Perfil) ?? "recepcao")}
        >
          <SelectTrigger>
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
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
