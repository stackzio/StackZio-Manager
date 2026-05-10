"use client";

import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/cn";

type IconComponent = React.ComponentType<{ className?: string }>;

const ICONS = [
  "Megaphone",
  "Users",
  "Sparkles",
  "Code2",
  "Building2",
  "Plane",
  "Tag",
  "Briefcase",
  "Wallet",
  "Gift",
  "Truck",
  "Coffee",
  "BookOpen",
  "Wrench",
  "Phone",
  "CreditCard",
  "ShoppingBag",
  "Globe",
  "Camera",
  "Palette",
] as const;

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {ICONS.map((name) => {
        const Icon =
          (LucideIcons as unknown as Record<string, IconComponent>)[name] ??
          LucideIcons.Tag;
        return (
          <button
            type="button"
            key={name}
            onClick={() => onChange(name)}
            className={cn(
              "flex size-9 items-center justify-center rounded-md border transition-colors",
              value === name
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-accent",
            )}
            aria-label={name}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
