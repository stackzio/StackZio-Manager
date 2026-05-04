"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = mounted && theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
              "hover:border-primary/40 hover:bg-accent/40",
              active && "border-primary bg-primary/5 ring-2 ring-primary/30",
            )}
          >
            <Icon className="size-5 text-muted-foreground" />
            <span className="flex-1 font-medium">{opt.label}</span>
            {active ? <Check className="size-4 text-primary" /> : null}
          </button>
        );
      })}
    </div>
  );
}
