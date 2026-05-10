import { Briefcase, Gift, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

const META = {
  SALARY: {
    label: "Salary",
    Icon: Wallet,
    tone: "border-primary/40 bg-primary/10 text-primary",
  },
  PROJECT: {
    label: "Project",
    Icon: Briefcase,
    tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  },
  BONUS: {
    label: "Bonus",
    Icon: Gift,
    tone: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-600",
  },
} as const;

export function KindChip({
  kind,
  className,
}: {
  kind: keyof typeof META;
  className?: string;
}) {
  const { label, Icon, tone } = META[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-3" /> {label}
    </span>
  );
}
