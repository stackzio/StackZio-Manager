"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  Gift,
  Plus,
  RotateCcw,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  PayoutForm,
  type PayoutFormMember,
  type PayoutFormProject,
  type PayoutKind,
} from "./payout-form";
import {
  RepeatLastMonth,
  type RepeatLastMonthSalary,
} from "./repeat-last-month";

interface Props {
  members: PayoutFormMember[];
  projects: PayoutFormProject[];
  lastSalaries: RepeatLastMonthSalary[];
  thisMonthISO: string;
  lastMonthISO: string;
}

const ALL_KINDS: PayoutKind[] = ["SALARY", "PROJECT", "BONUS"];

const KIND_META: Record<
  PayoutKind,
  { label: string; Icon: typeof Wallet; tone: string }
> = {
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
};

function initials(name: string | null, email: string): string {
  const src = (name && name.trim()) || email;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function PayoutsToolbar({
  members,
  projects,
  lastSalaries,
  thisMonthISO,
  lastMonthISO,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const selectedMembers = useMemo(() => {
    const raw = params.get("members") ?? "";
    return new Set(raw.split(",").filter(Boolean));
  }, [params]);

  const selectedKinds = useMemo(() => {
    const raw = params.get("kinds") ?? "";
    return new Set(
      raw
        .split(",")
        .filter(Boolean)
        .filter((k): k is PayoutKind =>
          (ALL_KINDS as string[]).includes(k),
        ),
    );
  }, [params]);

  const projectId = params.get("projectId") ?? "";
  const [from, setFrom] = useState<string>(params.get("from") ?? "");
  const [to, setTo] = useState<string>(params.get("to") ?? "");
  const [creating, setCreating] = useState(false);
  const [repeating, setRepeating] = useState(false);

  function updateParam(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (value && value.length > 0) sp.set(key, value);
    else sp.delete(key);
    router.push("/payouts?" + sp.toString());
  }

  function toggleMember(id: string) {
    const next = new Set(selectedMembers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateParam("members", Array.from(next).join(",") || null);
  }

  function clearMembers() {
    updateParam("members", null);
  }

  function toggleKind(k: PayoutKind) {
    const next = new Set(selectedKinds);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    updateParam("kinds", Array.from(next).join(",") || null);
  }

  function clearAll() {
    router.push("/payouts");
  }

  const hasFilter =
    selectedMembers.size > 0 ||
    selectedKinds.size > 0 ||
    !!projectId ||
    !!from ||
    !!to;

  const memberLabel =
    selectedMembers.size === 0
      ? "All members"
      : selectedMembers.size === 1
        ? (() => {
            const id = Array.from(selectedMembers)[0]!;
            const m = members.find((x) => x.id === id);
            return m ? (m.name ?? m.email) : "1 member";
          })()
        : `${selectedMembers.size} members`;

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Users className="size-4" />
                <span className="max-w-[160px] truncate">{memberLabel}</span>
                <ChevronDown className="size-3.5 opacity-70" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-2">
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Filter by member
                </span>
                {selectedMembers.size > 0 ? (
                  <button
                    type="button"
                    onClick={clearMembers}
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No members
                  </p>
                ) : (
                  members.map((m) => {
                    const checked = selectedMembers.has(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMember(m.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent",
                          checked && "bg-accent",
                        )}
                        aria-pressed={checked}
                      >
                        <Avatar className="size-6">
                          {m.image ? (
                            <AvatarImage
                              src={m.image}
                              alt={m.name ?? m.email}
                            />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {initials(m.name, m.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex min-w-0 flex-1 flex-col leading-tight">
                          <span className="truncate text-sm font-medium">
                            {m.name ?? m.email}
                          </span>
                          {m.name ? (
                            <span className="truncate text-[11px] text-muted-foreground">
                              {m.email}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            checked ? "bg-primary" : "bg-transparent",
                          )}
                          aria-hidden
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1">
            {ALL_KINDS.map((k) => {
              const { label, Icon, tone } = KIND_META[k];
              const active = selectedKinds.has(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKind(k)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                    active ? tone : "border-input bg-background text-muted-foreground hover:bg-accent",
                  )}
                  aria-pressed={active}
                >
                  <Icon className="size-3" /> {label}
                </button>
              );
            })}
          </div>

          <Select
            value={projectId || "__ALL__"}
            onValueChange={(v) =>
              updateParam("projectId", v === "__ALL__" ? null : v)
            }
          >
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setRepeating(true)}
              disabled={lastSalaries.length === 0}
              title={
                lastSalaries.length === 0
                  ? "No salaries were recorded last month"
                  : "Repeat last month's salaries"
              }
            >
              <RotateCcw className="size-4" />
              Repeat last month&apos;s salaries
            </Button>
            <Button variant="gradient" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Record payout
            </Button>
          </div>
        </div>
      </div>

      {creating ? (
        <PayoutForm
          open={creating}
          onOpenChange={setCreating}
          members={members}
          projects={projects}
          initial={null}
        />
      ) : null}

      {repeating ? (
        <RepeatLastMonth
          open={repeating}
          onOpenChange={setRepeating}
          salaries={lastSalaries}
          forMonth={thisMonthISO}
          fromMonth={lastMonthISO}
        />
      ) : null}
    </>
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
