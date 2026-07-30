import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@empresa/supabase", "@empresa/ui", "@empresa/auth"],
  experimental: {
    // Desligado: o cache persistente do Turbopack em .next/ entra em conflito
    // com a sincronização em tempo real do OneDrive (pasta do projeto fica
    // dentro de Documents, redirecionado para OneDrive), causando panics
    // intermitentes ("Next.js package not found") e recarregamentos em loop.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
