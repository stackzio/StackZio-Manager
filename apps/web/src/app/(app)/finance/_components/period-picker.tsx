"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { CalendarRange, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { PeriodPreset } from "@/server/finance/period";

interface Props {
  preset: PeriodPreset;
  /** ISO yyyy-MM-dd of the currently-active range, used as default custom values. */
  from: string;
  to: string;
}

const PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom" },
];

export function PeriodPicker({ preset, from, to }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const baseParams = useMemo(() => {
    const p = new URLSearchParams(searchParams?.toString() ?? "");
    p.delete("preset");
    p.delete("from");
    p.delete("to");
    return p;
  }, [searchParams]);

  function pushPreset(next: PeriodPreset, range?: { from: string; to: string }) {
    const p = new URLSearchParams(baseParams.toString());
    p.set("preset", next);
    if (next === "custom" && range) {
      p.set("from", range.from);
      p.set("to", range.to);
    }
    const qs = p.toString();
    startTransition(() => {
      router.push(qs ? `/finance?${qs}` : "/finance");
    });
  }

  return (
    <div className="flex items-center gap-2">
      {/* Desktop / tablet: inline button group */}
      <div
        className={cn(
          "hidden flex-wrap items-center gap-1 rounded-full border bg-card p-1 shadow-sm sm:flex",
          isPending && "opacity-70",
        )}
        role="tablist"
        aria-label="Period preset"
      >
        {PRESETS.filter((p) => p.value !== "custom").map((p) => {
          const active = preset === p.value;
          return (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={isPending}
              onClick={() => pushPreset(p.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          );
        })}
        <CustomRangePopover
          preset={preset}
          defaultFrom={from}
          defaultTo={to}
          onApply={(range) => pushPreset("custom", range)}
        />
      </div>

      {/* Mobile: Select */}
      <div className="sm:hidden">
        {preset === "custom" ? (
          <MobileCustom from={from} to={to} onApply={(range) => pushPreset("custom", range)} />
        ) : (
          <Select
            value={preset}
            onValueChange={(v) => {
              if (v === "custom") {
                pushPreset("custom", { from, to });
              } else {
                pushPreset(v as PeriodPreset);
              }
            }}
          >
            <SelectTrigger className="h-9 min-w-[10.5rem] rounded-full">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

function CustomRangePopover({
  preset,
  defaultFrom,
  defaultTo,
  onApply,
}: {
  preset: PeriodPreset;
  defaultFrom: string;
  defaultTo: string;
  onApply: (range: { from: string; to: string }) => void;
}) {
  const active = preset === "custom";
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    if (new Date(from) > new Date(to)) return;
    onApply({ from, to });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
          )}
        >
          <CalendarRange className="size-3.5" />
          {active ? `${defaultFrom} → ${defaultTo}` : "Custom"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <form onSubmit={apply} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="finance-from" className="text-xs">
              From
            </Label>
            <Input
              id="finance-from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="finance-to" className="text-xs">
              To
            </Label>
            <Input
              id="finance-to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm" className="w-full gap-1.5">
            <Check className="size-3.5" /> Apply
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function MobileCustom({
  from,
  to,
  onApply,
}: {
  from: string;
  to: string;
  onApply: (range: { from: string; to: string }) => void;
}) {
  return (
    <CustomRangePopover
      preset="custom"
      defaultFrom={from}
      defaultTo={to}
      onApply={onApply}
    />
  );
}
