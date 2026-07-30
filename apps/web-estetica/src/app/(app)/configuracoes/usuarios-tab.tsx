"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@clinica/ui/components/button";
import { Input } from "@clinica/ui/components/input";
import { Label } from "@clinica/ui/components/label";
import type { Perfil, Usuario } from "@/lib/types/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@clinica/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@clinica/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@clinica/ui/components/dialog";
import { Badge } from "@clinica/ui/components/badge";

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
  const [especialidade, setEspecialidade] = useState("");
  const [atende, setAtende] = useState(false);
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

    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        email,
        perfil,
        especialidade: especialidade || null,
        atende,
      }),
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
    setEspecialidade("");
    setAtende(false);
    router.refresh();
  }

  async function handleToggleAtivo(usuario: Usuario) {
    setAlternandoId(usuario.id);
    const res = await fetch(`/api/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: usuario.nome,
        perfil: usuario.perfil,
        especialidade: usuario.especialidade,
        atende: usuario.atende,
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Especialidade</label>
          <Input
            value={especialidade}
            onChange={(e) => setEspecialidade(e.target.value)}
            placeholder="Opcional"
            className="w-48"
          />
        </div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={atende}
            onChange={(e) => setAtende(e.target.checked)}
            className="size-4 rounded border-input"
          />
          Atende (aparece na Agenda)
        </label>
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

      <div className="hidden overflow-x-auto rounded-lg border bg-background md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Atende</TableHead>
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
                <TableCell>{u.especialidade ?? "—"}</TableCell>
                <TableCell>{u.atende ? "Sim" : "Não"}</TableCell>
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
                  colSpan={7}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {usuarios.length === 0 ? (
        <div className="rounded-lg border bg-background py-6 text-center text-muted-foreground md:hidden">
          Nenhum usuário cadastrado.
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:hidden">
          {usuarios.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-2 rounded-lg border bg-background p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{u.nome}</span>
                <Badge variant={u.ativo ? "default" : "outline"}>
                  {u.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span>{u.email}</span>
                <span>
                  {perfilLabel(u.perfil)}
                  {u.especialidade ? ` · ${u.especialidade}` : ""}
                </span>
                <span>Atende: {u.atende ? "Sim" : "Não"}</span>
              </div>
              <div className="flex justify-end gap-2 border-t pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditando(u)}>
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
              </div>
            </div>
          ))}
        </div>
      )}

      <EditarUsuarioDialog
        usuario={editando}
        onClose={() => setEditando(null)}
        onSaved={() => {
          setEditando(null);
          router.refresh();
        }}
      />
    </div>
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
  const [especialidade, setEspecialidade] = useState(
    usuario.especialidade ?? "",
  );
  const [atende, setAtende] = useState(usuario.atende);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`/api/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        perfil,
        especialidade: especialidade || null,
        atende,
        ativo: usuario.ativo,
      }),
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
      <div className="flex flex-col gap-2">
        <Label>Especialidade</Label>
        <Input
          value={especialidade}
          onChange={(e) => setEspecialidade(e.target.value)}
          placeholder="Opcional"
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={atende}
          onChange={(e) => setAtende(e.target.checked)}
          className="size-4 rounded border-input"
        />
        Atende (aparece na Agenda)
      </label>
      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
