"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { createClient } from "@empresa/supabase/client";
import { Badge } from "@empresa/ui/components/badge";
import { cn } from "@empresa/ui/utils";
import type { FotoAtendimento } from "@/lib/types/db";

type FotoComUrl = FotoAtendimento & { signedUrl: string };

interface ParFotos {
  antes: FotoComUrl | null;
  depois: FotoComUrl | null;
}

function parearFotosAntesDepois(fotos: FotoComUrl[]): ParFotos[] {
  const porCriadoEm = (a: FotoComUrl, b: FotoComUrl) =>
    new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
  const antes = fotos.filter((f) => f.tipo === "antes").sort(porCriadoEm);
  const depois = fotos.filter((f) => f.tipo === "depois").sort(porCriadoEm);
  const total = Math.max(antes.length, depois.length);
  return Array.from({ length: total }, (_, i) => ({
    antes: antes[i] ?? null,
    depois: depois[i] ?? null,
  }));
}

export function FotosComparador({ fotos }: { fotos: FotoComUrl[] }) {
  const router = useRouter();
  const pares = useMemo(() => parearFotosAntesDepois(fotos), [fotos]);

  async function excluirFoto(foto: FotoComUrl) {
    if (!window.confirm("Excluir esta foto? Essa ação não pode ser desfeita.")) return;
    const supabase = createClient();
    const { error: storageError } = await supabase.storage
      .from("fotos-atendimento")
      .remove([foto.url]);
    if (storageError) {
      toast.error("Não foi possível excluir a foto.");
      return;
    }
    const { error } = await supabase.from("fotos_atendimento").delete().eq("id", foto.id);
    if (error) {
      toast.error("Não foi possível excluir a foto.");
      return;
    }
    toast.success("Foto excluída.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3">
      {pares.map((par, i) => {
        if (par.antes && par.depois) {
          return (
            <ComparadorSlider
              key={`${par.antes.id}-${par.depois.id}`}
              antes={par.antes}
              depois={par.depois}
              onExcluir={excluirFoto}
            />
          );
        }
        const foto = par.antes ?? par.depois;
        if (!foto) return null;
        return <FotoUnica key={foto.id ?? i} foto={foto} onExcluir={excluirFoto} />;
      })}
    </div>
  );
}

function FotoUnica({
  foto,
  onExcluir,
}: {
  foto: FotoComUrl;
  onExcluir: (foto: FotoComUrl) => void;
}) {
  return (
    <div className="group relative aspect-square w-40 overflow-hidden rounded-md border sm:w-44">
      <a href={foto.signedUrl} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.signedUrl}
          alt={`Foto ${foto.tipo} do atendimento`}
          className="h-full w-full object-cover transition group-hover:opacity-80"
        />
      </a>
      <Badge className="absolute bottom-1 left-1" variant="secondary">
        {foto.tipo === "antes" ? "Antes" : "Depois"}
      </Badge>
      <button
        type="button"
        onClick={() => onExcluir(foto)}
        className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
        aria-label="Excluir foto"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ComparadorSlider({
  antes,
  depois,
  onExcluir,
}: {
  antes: FotoComUrl;
  depois: FotoComUrl;
  onExcluir: (foto: FotoComUrl) => void;
}) {
  const [posicao, setPosicao] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function atualizarPosicao(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosicao(Math.min(100, Math.max(0, pct)));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    atualizarPosicao(e.clientX);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    atualizarPosicao(e.clientX);
  }

  function handlePointerUp() {
    draggingRef.current = false;
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="group relative aspect-4/3 w-64 touch-none overflow-hidden rounded-md border select-none sm:w-72"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={depois.signedUrl}
        alt="Foto depois do atendimento"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - posicao}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={antes.signedUrl}
          alt="Foto antes do atendimento"
          draggable={false}
          className="h-full w-full object-cover"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 cursor-ew-resize bg-white shadow"
        style={{ left: `${posicao}%` }}
      >
        <div className="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/40" />
      </div>
      <Badge className="absolute top-1 left-1" variant="secondary">
        Antes
      </Badge>
      <Badge className="absolute top-1 right-1" variant="secondary">
        Depois
      </Badge>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onExcluir(antes)}
        className="absolute top-1 left-1 mt-6 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
        aria-label="Excluir foto antes"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onExcluir(depois)}
        className="absolute top-1 right-1 mt-6 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
        aria-label="Excluir foto depois"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div
        className={cn(
          "pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white transition-opacity",
          "opacity-0 group-hover:opacity-100",
        )}
      >
        Arraste para comparar
      </div>
    </div>
  );
}
