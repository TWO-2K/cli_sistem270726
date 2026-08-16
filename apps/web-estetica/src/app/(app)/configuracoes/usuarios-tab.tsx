"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import { Label } from "@empresa/ui/components/label";
import type { HorarioDia, Perfil, Unidade, Usuario } from "@/lib/types/db";
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@empresa/ui/components/sheet";
import { Badge } from "@empresa/ui/components/badge";
import { HorarioSemanaEditor } from "./horario-semana-editor";

const PERFIS: { value: Perfil; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "recepcao", label: "Recepção" },
  { value: "profissional", label: "Profissional" },
  { value: "financeiro", label: "Financeiro" },
];

function perfilLabel(perfil: Perfil) {
  return PERFIS.find((p) => p.value === perfil)?.label ?? perfil;
}

export function UsuariosTab({
  usuarios,
  unidades = [],
  horarioClinica,
}: {
  usuarios: Usuario[];
  unidades?: Unidade[];
  horarioClinica: HorarioDia[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("recepcao");
  const [especialidade, setEspecialidade] = useState("");
  const [atende, setAtende] = useState(false);
  const [unidadeId, setUnidadeId] = useState<string | null>(null);
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
        unidade_id: unidadeId,
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
    setUnidadeId(null);
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
        {unidades.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Unidade</label>
            <Select
              value={unidadeId ?? "__none__"}
              onValueChange={(v) =>
                setUnidadeId(v === "__none__" ? null : (v ?? null))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Nenhuma">
                  {(value: string) =>
                    unidades.find((u) => u.id === value)?.nome ?? "Nenhuma"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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

      <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
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
        <div className="rounded-lg border bg-card py-6 text-center text-muted-foreground md:hidden">
          Nenhum usuário cadastrado.
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:hidden">
          {usuarios.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-4"
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
        unidades={unidades}
        horarioClinica={horarioClinica}
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
  unidades,
  horarioClinica,
  onClose,
  onSaved,
}: {
  usuario: Usuario | null;
  unidades: Unidade[];
  horarioClinica: HorarioDia[];
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Sheet
      open={usuario !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar usuário</SheetTitle>
        </SheetHeader>
        {usuario && (
          <EditarUsuarioForm
            key={usuario.id}
            usuario={usuario}
            unidades={unidades}
            horarioClinica={horarioClinica}
            onSaved={onSaved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditarUsuarioForm({
  usuario,
  unidades,
  horarioClinica,
  onSaved,
}: {
  usuario: Usuario;
  unidades: Unidade[];
  horarioClinica: HorarioDia[];
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(usuario.nome);
  const [perfil, setPerfil] = useState<Perfil>(usuario.perfil);
  const [especialidade, setEspecialidade] = useState(
    usuario.especialidade ?? "",
  );
  const [atende, setAtende] = useState(usuario.atende);
  const [unidadeId, setUnidadeId] = useState<string | null>(
    usuario.unidade_id,
  );
  const [horarioProprio, setHorarioProprio] = useState(
    usuario.horario_funcionamento !== null,
  );
  const [horarioFuncionamento, setHorarioFuncionamento] = useState<HorarioDia[]>(
    usuario.horario_funcionamento ?? horarioClinica,
  );
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
        unidade_id: unidadeId,
        horario_funcionamento: horarioProprio ? horarioFuncionamento : null,
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
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
      {unidades.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Unidade</Label>
          <Select
            value={unidadeId ?? "__none__"}
            onValueChange={(v) =>
              setUnidadeId(v === "__none__" ? null : (v ?? null))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Nenhuma">
                {(value: string) =>
                  unidades.find((u) => u.id === value)?.nome ?? "Nenhuma"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma</SelectItem>
              {unidades.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={atende}
          onChange={(e) => setAtende(e.target.checked)}
          className="size-4 rounded border-input"
        />
        Atende (aparece na Agenda)
      </label>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={horarioProprio}
            onChange={(e) => {
              setHorarioProprio(e.target.checked);
              if (e.target.checked && usuario.horario_funcionamento === null) {
                setHorarioFuncionamento(horarioClinica);
              }
            }}
            className="size-4 rounded border-input"
          />
          Usar horário próprio (diferente da clínica)
        </label>
        {horarioProprio && (
          <HorarioSemanaEditor
            horarios={horarioFuncionamento}
            onChange={setHorarioFuncionamento}
          />
        )}
      </div>
      <SheetFooter className="px-0">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </SheetFooter>
    </form>
  );
}
