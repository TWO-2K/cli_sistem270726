import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@empresa/ui/utils";

/**
 * Shell de página padrão do painel admin: link de "voltar" opcional acima
 * do título, título + descrição à esquerda, ações (primária/secundária) à
 * direita. Usar no topo de toda página do app admin para manter hierarquia
 * e espaçamento consistentes (ver `apps/admin/src/app/(admin)/page.tsx` e
 * `empresas/[id]/page.tsx`).
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {back.label}
          </Link>
        )}
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Título de seção secundário, para dividir uma página em blocos (ex.:
 * "Métricas", "Usuários da empresa") sem competir com o `PageHeader`.
 */
export function SectionHeading({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
