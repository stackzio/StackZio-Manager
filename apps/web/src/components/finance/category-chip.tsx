import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/cn";

type IconComponent = React.ComponentType<{ className?: string }>;

export function CategoryChip({
  name,
  color,
  icon,
  className,
}: {
  name: string;
  color: string;
  icon: string;
  className?: string;
}) {
  const Icon =
    (LucideIcons as unknown as Record<string, IconComponent>)[icon] ??
    LucideIcons.Tag;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={{
        borderColor: color + "55",
        color,
        backgroundColor: color + "11",
      }}
    >
      <Icon className="size-3" />
      {name}
    </span>
  );
}
