"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import * as LucideIcons from "lucide-react";
import { Check, ListFilter, Plus, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import {
  ExpenseForm,
  type ExpenseFormCategory,
} from "./expense-form";

type IconComponent = React.ComponentType<{ className?: string }>;

interface Props {
  categories: ExpenseFormCategory[];
}

export function ExpensesToolbar({ categories }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const cats = useMemo(() => {
    const raw = params.get("cats") ?? "";
    return new Set(raw.split(",").filter(Boolean));
  }, [params]);

  const [q, setQ] = useState<string>(params.get("q") ?? "");
  const [from, setFrom] = useState<string>(params.get("from") ?? "");
  const [to, setTo] = useState<string>(params.get("to") ?? "");
  const [creating, setCreating] = useState(false);

  // Keep local search input in sync if URL changes from elsewhere.
  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  // Debounce search-input → URL update.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleQ(next: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam("q", next || null);
    }, 300);
  }

  function updateParam(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (value && value.length > 0) sp.set(key, value);
    else sp.delete(key);
    router.push("/expenses?" + sp.toString());
  }

  function toggleCategory(id: string) {
    const next = new Set(cats);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const value = Array.from(next).join(",");
    updateParam("cats", value || null);
  }

  function clearAll() {
    router.push("/expenses");
  }

  const hasFilter = cats.size > 0 || q || from || to;

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              placeholder="Search by vendor…"
              onChange={(e) => {
                setQ(e.target.value);
                scheduleQ(e.target.value);
              }}
              className="pl-9 pr-9"
            />
            {q ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Clear search"
                onClick={() => {
                  setQ("");
                  updateParam("q", null);
                }}
                className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
              >
                <X className="size-3.5" />
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <DateField
              id="from"
              label="From"
              value={from}
              onChange={(v) => {
                setFrom(v);
                updateParam("from", v || null);
              }}
            />
            <DateField
              id="to"
              label="To"
              value={to}
              onChange={(v) => {
                setTo(v);
                updateParam("to", v || null);
              }}
            />
          </div>

          {hasFilter ? (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}

          <div className="ml-auto">
            <Button variant="gradient" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Add expense
            </Button>
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <ListFilter className="size-3" /> Filter by category
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <AllChip active={cats.size === 0} onClick={() => updateParam("cats", null)} />
              {categories.map((c) => (
                <FilterChip
                  key={c.id}
                  name={c.name}
                  color={c.color}
                  icon={c.icon}
                  active={cats.has(c.id)}
                  onClick={() => toggleCategory(c.id)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {creating ? (
        <ExpenseForm
          open={creating}
          onOpenChange={setCreating}
          categories={categories}
          initial={null}
        />
      ) : null}
    </>
  );
}

function FilterChip({
  name,
  color,
  icon,
  active,
  onClick,
}: {
  name: string;
  color: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  const Icon =
    (LucideIcons as unknown as Record<string, IconComponent>)[icon] ??
    LucideIcons.Tag;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Toggle ${name} filter`}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        active ? "shadow-sm" : "hover:-translate-y-px",
      )}
      style={
        active
          ? {
              backgroundColor: color,
              borderColor: color,
              color: "#fff",
            }
          : {
              backgroundColor: color + "14",
              borderColor: color + "66",
              color,
            }
      }
    >
      {active ? <Check className="size-3" /> : <Icon className="size-3" />}
      {name}
    </button>
  );
}

function AllChip({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label="Show all categories"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        active
          ? "border-transparent bg-brand-gradient text-white shadow-sm"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40",
      )}
    >
      <Sparkles className="size-3" />
      All
    </button>
  );
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-[140px]"
      />
    </div>
  );
}
