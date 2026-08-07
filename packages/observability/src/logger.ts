import "server-only";
import { captureError } from "./sentry";

type Nivel = "debug" | "info" | "warn" | "error";

function escrever(nivel: Nivel, message: string, context?: Record<string, unknown>) {
  const linha = JSON.stringify({
    level: nivel,
    message,
    context,
    timestamp: new Date().toISOString(),
  });
  if (nivel === "error" || nivel === "warn") {
    console.error(linha);
  } else {
    console.log(linha);
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    escrever("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    escrever("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    escrever("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => {
    escrever("error", message, context);
    captureError(new Error(message), context);
  },
};
