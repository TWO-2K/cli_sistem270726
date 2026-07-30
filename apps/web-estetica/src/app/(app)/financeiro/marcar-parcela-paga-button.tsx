"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@empresa/supabase/client";
import { Button } from "@empresa/ui/components/button";

export function MarcarParcelaPagaButton({ parcelaId }: { parcelaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("marcar_parcela_paga", {
      p_parcela_id: parcelaId,
    });
    setLoading(false);

    if (error) {
      toast.error("Não foi possível marcar a parcela como paga.");
      return;
    }

    toast.success("Parcela marcada como paga.");
    router.refresh();
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? "Salvando..." : "Marcar como pago"}
    </Button>
  );
}
