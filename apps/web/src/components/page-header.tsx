import { cn } from "@/lib/cn";

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, breadcrumbs, className }: Props) {
  return (
    <div className={cn("mb-6 flex flex-col gap-2", className)}>
      {breadcrumbs ? <div className="text-xs text-muted-foreground">{breadcrumbs}</div> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
