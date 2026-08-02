"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";
import { Input } from "@empresa/ui/components/input";
import type {
  ComissaoProcedimento,
  ComissaoProfissional,
  ComissaoProfissionalProcedimento,
  Procedimento,
  Usuario,
} from "@/lib/types/db";
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

interface ComissoesTabProps {
  profissionais: Usuario[];
  procedimentos: Procedimento[];
  comissoesProfissional: ComissaoProfissional[];
  comissoesProcedimento: ComissaoProcedimento[];
  comissoesCombinadas: ComissaoProfissionalProcedimento[];
}

export function ComissoesTab({
  profissionais,
  procedimentos,
  comissoesProfissional,
  comissoesProcedimento,
  comissoesCombinadas,
}: ComissoesTabProps) {
  return (
    <div className="mt-4 flex flex-col gap-8">
      <PorProfissionalSection
        profissionais={profissionais}
        comissoes={comissoesProfissional}
      />
      <PorProcedimentoSection
        procedimentos={procedimentos}
        comissoes={comissoesProcedimento}
      />
      <CombinadaSection
        profissionais={profissionais}
        procedimentos={procedimentos}
        comissoes={comissoesCombinadas}
      />
    </div>
  );
}

function nomeUsuario(profissionais: Usuario[], id: string) {
  return profissionais.find((p) => p.id === id)?.nome ?? "—";
}

function nomeProcedimento(procedimentos: Procedimento[], id: string) {
  return procedimentos.find((p) => p.id === id)?.nome ?? "—";
}

function PorProfissionalSection({
  profissionais,
  comissoes,
}: {
  profissionais: Usuario[];
  comissoes: ComissaoProfissional[];
}) {
  const router = useRouter();
  const [usuarioId, setUsuarioId] = useState(profissionais[0]?.id ?? "");
  const [percentual, setPercentual] = useState("10");
  const [loading, setLoading] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("comissao_profissional")
      .upsert(
        { usuario_id: usuarioId, percentual: Number(percentual) },
        { onConflict: "empresa_id,usuario_id" },
      );
    setLoading(false);
    if (error) {
      toast.error("Não foi possível salvar a regra.");
      return;
    }
    toast.success("Regra de comissão salva.");
    router.refresh();
  }

  async function excluir(id: string) {
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("comissao_profissional")
      .delete()
      .eq("id", id);
    setExcluindoId(null);
    if (error) {
      toast.error("Não foi possível remover a regra.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Por profissional</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Profissional</label>
          <Select value={usuarioId} onValueChange={(v) => setUsuarioId(v ?? "")}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profissionais.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Percentual (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            className="w-28"
          />
        </div>
        <Button type="submit" disabled={loading || !usuarioId}>
          {loading ? "Salvando..." : "Salvar regra"}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Percentual</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  {nomeUsuario(profissionais, c.usuario_id)}
                </TableCell>
                <TableCell>{c.percentual}%</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={excluindoId === c.id}
                    onClick={() => excluir(c.id)}
                  >
                    {excluindoId === c.id ? "Removendo..." : "Remover"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {comissoes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhuma regra por profissional cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PorProcedimentoSection({
  procedimentos,
  comissoes,
}: {
  procedimentos: Procedimento[];
  comissoes: ComissaoProcedimento[];
}) {
  const router = useRouter();
  const [procedimentoId, setProcedimentoId] = useState(
    procedimentos[0]?.id ?? "",
  );
  const [percentual, setPercentual] = useState("10");
  const [loading, setLoading] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("comissao_procedimento")
      .upsert(
        { procedimento_id: procedimentoId, percentual: Number(percentual) },
        { onConflict: "empresa_id,procedimento_id" },
      );
    setLoading(false);
    if (error) {
      toast.error("Não foi possível salvar a regra.");
      return;
    }
    toast.success("Regra de comissão salva.");
    router.refresh();
  }

  async function excluir(id: string) {
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("comissao_procedimento")
      .delete()
      .eq("id", id);
    setExcluindoId(null);
    if (error) {
      toast.error("Não foi possível remover a regra.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Por procedimento</h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Procedimento</label>
          <Select
            value={procedimentoId}
            onValueChange={(v) => setProcedimentoId(v ?? "")}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {procedimentos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Percentual (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            className="w-28"
          />
        </div>
        <Button type="submit" disabled={loading || !procedimentoId}>
          {loading ? "Salvando..." : "Salvar regra"}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Procedimento</TableHead>
              <TableHead>Percentual</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  {nomeProcedimento(procedimentos, c.procedimento_id)}
                </TableCell>
                <TableCell>{c.percentual}%</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={excluindoId === c.id}
                    onClick={() => excluir(c.id)}
                  >
                    {excluindoId === c.id ? "Removendo..." : "Remover"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {comissoes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhuma regra por procedimento cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CombinadaSection({
  profissionais,
  procedimentos,
  comissoes,
}: {
  profissionais: Usuario[];
  procedimentos: Procedimento[];
  comissoes: ComissaoProfissionalProcedimento[];
}) {
  const router = useRouter();
  const [usuarioId, setUsuarioId] = useState(profissionais[0]?.id ?? "");
  const [procedimentoId, setProcedimentoId] = useState(
    procedimentos[0]?.id ?? "",
  );
  const [percentual, setPercentual] = useState("10");
  const [loading, setLoading] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("comissao_profissional_procedimento")
      .upsert(
        {
          usuario_id: usuarioId,
          procedimento_id: procedimentoId,
          percentual: Number(percentual),
        },
        { onConflict: "empresa_id,usuario_id,procedimento_id" },
      );
    setLoading(false);
    if (error) {
      toast.error("Não foi possível salvar a regra.");
      return;
    }
    toast.success("Regra de comissão salva.");
    router.refresh();
  }

  async function excluir(id: string) {
    setExcluindoId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("comissao_profissional_procedimento")
      .delete()
      .eq("id", id);
    setExcluindoId(null);
    if (error) {
      toast.error("Não foi possível remover a regra.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        Combinada (profissional + procedimento)
      </h3>
      <p className="text-sm text-muted-foreground">
        Regra mais específica: prevalece sobre as regras por profissional e
        por procedimento acima.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Profissional</label>
          <Select value={usuarioId} onValueChange={(v) => setUsuarioId(v ?? "")}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profissionais.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Procedimento</label>
          <Select
            value={procedimentoId}
            onValueChange={(v) => setProcedimentoId(v ?? "")}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {procedimentos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Percentual (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            className="w-28"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !usuarioId || !procedimentoId}
        >
          {loading ? "Salvando..." : "Salvar regra"}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Procedimento</TableHead>
              <TableHead>Percentual</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  {nomeUsuario(profissionais, c.usuario_id)}
                </TableCell>
                <TableCell>
                  {nomeProcedimento(procedimentos, c.procedimento_id)}
                </TableCell>
                <TableCell>{c.percentual}%</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={excluindoId === c.id}
                    onClick={() => excluir(c.id)}
                  >
                    {excluindoId === c.id ? "Removendo..." : "Remover"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {comissoes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-6 text-center text-muted-foreground"
                >
                  Nenhuma regra combinada cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
