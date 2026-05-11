"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock,
  CalendarRange,
  Pause,
  Play,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@stackzio/lib/date";
import { formatMoney } from "@stackzio/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryChip } from "@/components/finance/category-chip";
import { cn } from "@/lib/cn";
import {
  deleteExpenseRuleAction,
  runExpenseRuleNowAction,
  setExpenseRuleActiveAction,
} from "@/server/finance/recurring/actions";
import { RecurringForm, type RecurringFormCategory } from "./recurring-form";

export interface RecurringRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  vendor: string | null;
  amount: string;
  amountNumber: number;
  currency: string;
  method: "BANK" | "CASH" | "UPI" | "CARD" | "OTHER";
  reference: string | null;
  note: string | null;
  frequency: "MONTHLY" | "YEARLY";
  dayOfMonth: number;
  monthOfYear: number | null;
  startsOn: string; // YYYY-MM-DD
  endsOn: string | null;
  active: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date;
  runCount: number;
}

interface Props {
  rows: RecurringRow[];
  categories: RecurringFormCategory[];
  currency: string;
  kpi: {
    activeCount: number;
    monthlyOutflow: number;
    yearlyOutflow: number;
  };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function ordinal(n: number): string {
  const suffixes: readonly ["th", "st", "nd", "rd"] = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const idx = v >= 11 && v <= 13 ? 0 : Math.min(v % 10, 3);
  return n + (suffixes[idx as 0 | 1 | 2 | 3]);
}

function describeCadence(r: RecurringRow): string {
  if (r.frequency === "MONTHLY") {
    return `Every month, ${ordinal(r.dayOfMonth)}`;
  }
  const m = MONTH_NAMES[(r.monthOfYear ?? 1) - 1];
  return `Every year on ${m} ${ordinal(r.dayOfMonth)}`;
}

export function RecurringList({ rows, categories, currency, kpi }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<RecurringRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function togglePause(row: RecurringRow) {
    if (busyId) return;
    setBusyId(row.id);
    const res = await setExpenseRuleActiveAction(row.id, !row.active);
    setBusyId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(row.active ? "Rule paused" : "Rule resumed");
    router.refresh();
  }

  async function remove(row: RecurringRow) {
    if (busyId) return;
    if (
      !confirm(
        `Delete this recurring rule? Already-created expenses will stay — only future runs are removed.`,
      )
    )
      return;
    setBusyId(row.id);
    const res = await deleteExpenseRuleAction(row.id);
    setBusyId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Rule deleted");
    router.refresh();
  }

  async function runNow(row: RecurringRow) {
    if (busyId) return;
    setBusyId(row.id);
    const res = await runExpenseRuleNowAction(row.id);
    setBusyId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Expense recorded");
    router.refresh();
  }

  return (
    <>
      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<Zap className="size-4" />}
          label="Active rules"
          value={String(kpi.activeCount)}
          tone="from-violet-500/15 to-violet-500/0 text-violet-300"
        />
        <KpiCard
          icon={<Repeat className="size-4" />}
          label="Monthly outflow"
          value={formatMoney(kpi.monthlyOutflow, currency as never)}
          tone="from-rose-500/15 to-rose-500/0 text-rose-300"
        />
        <KpiCard
          icon={<CalendarRange className="size-4" />}
          label="Yearly outflow"
          value={formatMoney(kpi.yearlyOutflow, currency as never)}
          tone="from-amber-500/15 to-amber-500/0 text-amber-300"
        />
      </div>

      {/* Header row: title + add button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Rules
          </h2>
        </div>
        <Button variant="gradient" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> New recurring rule
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState onAdd={() => setCreating(true)} />
      ) : (
        <motion.ul
          layout
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
        >
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <motion.li
                key={row.id}
                layout
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.22, ease: "easeOut" },
                  },
                }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card
                  className={cn(
                    "group relative overflow-hidden transition-shadow hover:shadow-md",
                    !row.active && "opacity-70",
                  )}
                >
                  {/* Gradient accent stripe along the top */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-0.5"
                    style={{
                      background: `linear-gradient(90deg, ${row.categoryColor} 0%, ${row.categoryColor}88 100%)`,
                    }}
                  />
                  <CardContent className="space-y-3 p-4">
                    {/* Top row: category + paused chip */}
                    <div className="flex items-center justify-between gap-2">
                      <CategoryChip
                        name={row.categoryName}
                        color={row.categoryColor}
                        icon={row.categoryIcon}
                      />
                      {!row.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <Pause className="size-3" /> Paused
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                          <Play className="size-3" /> Active
                        </span>
                      )}
                    </div>

                    {/* Amount + cadence */}
                    <div>
                      <p className="truncate text-base font-semibold leading-tight">
                        {row.vendor && row.vendor.trim().length > 0
                          ? row.vendor
                          : row.categoryName}
                      </p>
                      <p className="mt-0.5 text-2xl font-semibold tabular-nums">
                        {formatMoney(row.amountNumber, row.currency as never)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {describeCadence(row)}
                      </p>
                    </div>

                    {/* Next / last run + run count */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-2 text-[11px]">
                      <Stat
                        icon={<CalendarClock className="size-3" />}
                        label="Next"
                        value={
                          row.active ? formatDate(row.nextRunAt) : "Paused"
                        }
                      />
                      <Stat
                        icon={<CalendarClock className="size-3" />}
                        label="Last"
                        value={row.lastRunAt ? formatDate(row.lastRunAt) : "—"}
                      />
                      <Stat
                        icon={<Wallet className="size-3" />}
                        label="Runs"
                        value={String(row.runCount)}
                      />
                    </div>

                    {row.note ? (
                      <p
                        className="line-clamp-2 text-xs text-muted-foreground"
                        title={row.note}
                      >
                        {row.note}
                      </p>
                    ) : null}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => setEditing(row)}
                        disabled={busyId === row.id}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => togglePause(row)}
                        disabled={busyId === row.id}
                      >
                        {row.active ? (
                          <>
                            <Pause className="size-3.5" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="size-3.5" />
                            Resume
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => runNow(row)}
                        disabled={busyId === row.id || !row.active}
                        title={row.active ? "Run once now" : "Resume first"}
                      >
                        <Zap className="size-3.5" />
                        Run now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto size-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => remove(row)}
                        disabled={busyId === row.id}
                        aria-label="Delete rule"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      {/* Create drawer */}
      {creating ? (
        <RecurringForm
          open={creating}
          onOpenChange={setCreating}
          categories={categories}
          initial={null}
        />
      ) : null}

      {/* Edit drawer */}
      {editing ? (
        <RecurringForm
          open={!!editing}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
          categories={categories}
          initial={{
            id: editing.id,
            categoryId: editing.categoryId,
            vendor: editing.vendor,
            amount: editing.amount,
            method: editing.method,
            reference: editing.reference,
            note: editing.note,
            frequency: editing.frequency,
            dayOfMonth: editing.dayOfMonth,
            monthOfYear: editing.monthOfYear,
            startsOn: editing.startsOn,
            endsOn: editing.endsOn,
            active: editing.active,
          }}
        />
      ) : null}
    </>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden bg-gradient-to-br", tone)}>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="rounded-lg bg-background/50 p-2">{icon}</span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <p className="truncate font-medium tabular-nums" title={value}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed bg-card p-12 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
      >
        <div className="absolute -left-20 -top-20 size-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-16 -bottom-20 size-64 rounded-full bg-fuchsia-400/15 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-3">
        <div className="rounded-full bg-brand-gradient p-3 text-primary-foreground shadow-glow-sm">
          <Repeat className="size-6" />
        </div>
        <h3 className="text-base font-semibold">No recurring rules yet</h3>
        <p className="text-sm text-muted-foreground">
          Set up domain renewals, ad budgets, software subscriptions — anything
          that hits your account on a schedule. We&apos;ll record the expense
          on the right day and ping you.
        </p>
        <Button variant="gradient" onClick={onAdd}>
          <Plus className="size-4" /> New recurring rule
        </Button>
      </div>
    </div>
  );
}
