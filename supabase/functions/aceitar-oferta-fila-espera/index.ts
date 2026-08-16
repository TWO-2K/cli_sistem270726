// Fase 2d: único caller autorizado da RPC `aceitar_oferta_fila_espera`
// (restrita a service_role — nunca exposta a anon/authenticated via
// supabase.rpc() direto do browser). Chamada pela página pública
// /reservar-horario/[token] via fetch simples, sem sessão nenhuma: quem
// valida a legitimidade é o token de uso único, não um JWT do paciente.
// Chamada direto do browser (origem diferente do domínio do Supabase) —
// precisa responder o preflight OPTIONS e mandar os headers de CORS em
// toda resposta, senão o navegador bloqueia antes mesmo da requisição sair.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { token } = await req.json();

  if (!token) {
    return new Response(JSON.stringify({ error: "Token ausente." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase.rpc("aceitar_oferta_fila_espera", {
    p_token: token,
  });

  if (error) {
    const status = error.code === "23P01" ? 409 : 400;
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
