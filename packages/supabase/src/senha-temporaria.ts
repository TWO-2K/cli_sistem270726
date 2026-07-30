import "server-only";
import { randomBytes } from "crypto";

export function gerarSenhaTemporaria() {
  // ~144 bits de entropia, URL-safe.
  return randomBytes(18).toString("base64url");
}
