"use client";

import { useEffect } from "react";
import { captureError } from "@empresa/observability/sentry";
import { Button } from "@empresa/ui/components/button";
import { Card } from "@empresa/ui/components/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <h1 className="text-lg font-semibold">Algo deu errado</h1>
        <p className="text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Você pode tentar novamente ou recarregar
          a página.
        </p>
        <Button onClick={() => reset()}>Tentar novamente</Button>
      </Card>
    </div>
  );
}
