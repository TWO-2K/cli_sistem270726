// Cliente Sentry minimalista, sem dependência de @sentry/nextjs: fala
// direto com a API HTTP "store" do Sentry (https://develop.sentry.dev/sdk/
// data-model/envelopes/), evitando puxar o SDK completo (source maps,
// instrumentation.ts, withSentryConfig em next.config.ts) para uma rodada
// em que o usuário ainda não tem conta/DSN. Sem SENTRY_DSN configurado,
// toda chamada é no-op silencioso — nunca lança, nunca atrasa o fluxo
// chamador. Quando o usuário adicionar SENTRY_DSN ao .env.local, passa a
// enviar eventos sem nenhuma mudança de código.
//
// Sem "server-only": precisa ser chamável de Client Components (dialogs de
// RPC) e de error.tsx (boundary do App Router), não só do servidor.

function getDsn(): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
}

function parseDsn(dsn: string) {
  const url = new URL(dsn);
  const projectId = url.pathname.replace(/^\//, "");
  if (!url.username || !projectId) return undefined;
  return {
    key: url.username,
    projectId,
    ingestUrl: `${url.protocol}//${url.host}/api/${projectId}/store/`,
  };
}

async function send(payload: Record<string, unknown>) {
  const dsn = getDsn();
  if (!dsn) return;
  const parsed = parseDsn(dsn);
  if (!parsed) return;

  try {
    await fetch(parsed.ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.key}, sentry_client=empresa-observability/0.1.0`,
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        platform: "javascript",
        ...payload,
      }),
    });
  } catch {
    // Observabilidade nunca deve derrubar o fluxo principal do app.
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  void send({
    level: "error",
    message: err.message,
    exception: {
      values: [
        {
          type: err.name,
          value: err.message,
          stacktrace: err.stack ? { raw: err.stack } : undefined,
        },
      ],
    },
    extra: context,
  });
}

export function captureEvent(name: string, data?: Record<string, unknown>) {
  void send({
    level: "info",
    message: name,
    extra: data,
  });
}
