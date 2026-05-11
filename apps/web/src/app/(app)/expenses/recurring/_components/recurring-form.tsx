"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarRange,
  Loader2,
  Pause,
  Play,
  Repeat,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategoryChip } from "@/components/finance/category-chip";
import { cn } from "@/lib/cn";
import {
  createExpenseRuleAction,
  updateExpenseRuleAction,
} from "@/server/finance/recurring/actions";
import { EXPENSE_METHODS } from "@/server/finance/schemas";
import type { UpsertExpenseRuleInput } from "@/server/finance/recurring/schemas";

type Method = (typeof EXPENSE_METHODS)[number];
type Frequency = "MONTHLY" | "YEARLY";

const METHOD_LABEL: Record<Method, string> = {
  BANK: "Bank transfer",
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

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

export interface RecurringFormCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface RecurringFormInitial {
  id: string;
  categoryId: string;
  vendor: string | null;
  amount: string;
  method: Method;
  reference: string | null;
  note: string | null;
  frequency: Frequency;
  dayOfMonth: number;
  monthOfYear: number | null;
  startsOn: string; // YYYY-MM-DD
  endsOn: string | null;
  active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: RecurringFormCategory[];
  initial: RecurringFormInitial | null;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function RecurringForm({ open, onOpenChange, categories, initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial;

  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [vendor, setVendor] = useState(initial?.vendor ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [method, setMethod] = useState<Method>(initial?.method ?? "BANK");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [frequency, setFrequency] = useState<Frequency>(
    initial?.frequency ?? "MONTHLY",
  );
  const [dayOfMonth, setDayOfMonth] = useState<number>(
    initial?.dayOfMonth ?? new Date().getUTCDate(),
  );
  const [monthOfYear, setMonthOfYear] = useState<number>(
    initial?.monthOfYear ?? new Date().getUTCMonth() + 1,
  );
  const [startsOn, setStartsOn] = useState(initial?.startsOn ?? todayISO());
  const [endsOn, setEndsOn] = useState(initial?.endsOn ?? "");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Reset when reopening with different initial.
    setCategoryId(initial?.categoryId ?? categories[0]?.id ?? "");
    setVendor(initial?.vendor ?? "");
    setAmount(initial?.amount ?? "");
    setMethod(initial?.method ?? "BANK");
    setReference(initial?.reference ?? "");
    setNote(initial?.note ?? "");
    setFrequency(initial?.frequency ?? "MONTHLY");
    setDayOfMonth(initial?.dayOfMonth ?? new Date().getUTCDate());
    setMonthOfYear(initial?.monthOfYear ?? new Date().getUTCMonth() + 1);
    setStartsOn(initial?.startsOn ?? todayISO());
    setEndsOn(initial?.endsOn ?? "");
    setActive(initial?.active ?? true);
  }, [open, initial, categories]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const nextRunPreview = useMemo(() => {
    if (!startsOn) return null;
    return previewNextRun({ frequency, dayOfMonth, monthOfYear, startsOn });
  }, [frequency, dayOfMonth, monthOfYear, startsOn]);

  async function submit() {
    if (pending) return;
    if (!categoryId) return toast.error("Pick a category");
    if (!/^\d+(\.\d{1,2})?$/.test(amount))
      return toast.error("Enter a valid amount (up to 2 decimals)");
    if (frequency === "YEARLY" && !monthOfYear)
      return toast.error("Pick a month for yearly recurring");
    if (endsOn && new Date(endsOn) < new Date(startsOn))
      return toast.error("End date must be on or after the start date");

    setPending(true);
    try {
      const input: UpsertExpenseRuleInput = {
        categoryId,
        vendor: vendor.trim() || undefined,
        amount,
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
        frequency,
        dayOfMonth,
        monthOfYear: frequency === "YEARLY" ? monthOfYear : undefined,
        startsOn,
        endsOn: endsOn || undefined,
        active,
      };
      const res = isEdit
        ? await updateExpenseRuleAction(initial!.id, input)
        : await createExpenseRuleAction(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Rule updated" : "Recurring rule created");
      onOpenChange(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-gradient text-white">
              <Repeat className="size-3.5" />
            </span>
            {isEdit ? "Edit recurring rule" : "New recurring rule"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes affect future runs only — already-created expenses stay as they are."
              : "Set the cadence and we'll create the expense for you on each cycle."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Frequency pills */}
          <div className="space-y-1.5">
            <Label>Cadence</Label>
            <div className="flex gap-2">
              <FrequencyPill
                active={frequency === "MONTHLY"}
                onClick={() => setFrequency("MONTHLY")}
                label="Monthly"
                icon={<CalendarClock className="size-4" />}
              />
              <FrequencyPill
                active={frequency === "YEARLY"}
                onClick={() => setFrequency("YEARLY")}
                label="Yearly"
                icon={<CalendarRange className="size-4" />}
              />
            </div>
          </div>

          {/* Cadence detail row */}
          <div
            className={cn(
              "grid gap-3",
              frequency === "YEARLY" ? "sm:grid-cols-2" : "sm:grid-cols-1",
            )}
          >
            {frequency === "YEARLY" ? (
              <div className="space-y-1.5">
                <Label htmlFor="monthOfYear">Month</Label>
                <Select
                  value={String(monthOfYear)}
                  onValueChange={(v) => setMonthOfYear(Number(v))}
                >
                  <SelectTrigger id="monthOfYear">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="dayOfMonth">Day of the month</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={String(dayOfMonth)}
                  onValueChange={(v) => setDayOfMonth(Number(v))}
                >
                  <SelectTrigger id="dayOfMonth" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {ordinal(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dayOfMonth >= 29 ? (
                  <span className="text-[11px] text-muted-foreground">
                    Months that end earlier use their last day.
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Start + end */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startsOn">Starts on</Label>
              <Input
                id="startsOn"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endsOn">
                Ends on <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="endsOn"
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                min={startsOn}
              />
            </div>
          </div>

          {/* Next-run preview */}
          {nextRunPreview ? (
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium">
                  First run:{" "}
                  <span className="text-primary">
                    {formatDateLong(nextRunPreview)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll create the expense on this date and notify you.
                </p>
              </div>
            </div>
          ) : null}

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="categoryId">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Pick a category">
                  {selectedCategory ? (
                    <CategoryChip
                      name={selectedCategory.name}
                      color={selectedCategory.color}
                      icon={selectedCategory.icon}
                    />
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <CategoryChip name={c.name} color={c.color} icon={c.icon} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor + amount */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vendor">
                Vendor <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Meta, Cloudflare, Anthropic…"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => {
                  if (amount && /^\d+(\.\d{1,2})?$/.test(amount)) {
                    setAmount(Number(amount).toFixed(2));
                  }
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Method + reference */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="method">Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {METHOD_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reference">
                Reference <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Invoice / txn id"
                maxLength={120}
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="note">
              Note <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything that helps future-you remember why."
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Active toggle (compact) */}
          <button
            type="button"
            onClick={() => setActive((s) => !s)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              active
                ? "border-success/40 bg-success/5"
                : "border-muted-foreground/30 bg-muted/30",
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full",
                active
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {active ? (
                <Play className="size-4" />
              ) : (
                <Pause className="size-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {active ? "Active" : "Paused"}
              </p>
              <p className="text-xs text-muted-foreground">
                {active
                  ? "We'll create the expense on each cycle."
                  : "Cron will skip this rule until you resume it."}
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground">Click to toggle</span>
          </button>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={submit} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isEdit ? "Save changes" : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FrequencyPill({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "border-primary bg-primary/10 text-primary shadow-glow-sm"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ordinal(n: number): string {
  const suffixes: readonly ["th", "st", "nd", "rd"] = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const idx = v >= 11 && v <= 13 ? 0 : Math.min(v % 10, 3);
  return n + (suffixes[idx as 0 | 1 | 2 | 3]);
}

function previewNextRun(args: {
  frequency: Frequency;
  dayOfMonth: number;
  monthOfYear: number;
  startsOn: string;
}): Date | null {
  const start = new Date(`${args.startsOn}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  if (args.frequency === "MONTHLY") {
    const y = start.getUTCFullYear();
    const m = start.getUTCMonth();
    const cap = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const day = Math.min(args.dayOfMonth, cap);
    const candidate = new Date(Date.UTC(y, m, day));
    if (candidate.getTime() >= start.getTime()) return candidate;
    const ny = m === 11 ? y + 1 : y;
    const nm = m === 11 ? 0 : m + 1;
    const ncap = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
    return new Date(Date.UTC(ny, nm, Math.min(args.dayOfMonth, ncap)));
  }
  // YEARLY
  const y = start.getUTCFullYear();
  const targetMonth = args.monthOfYear - 1;
  const cap = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(args.dayOfMonth, cap);
  let candidate = new Date(Date.UTC(y, targetMonth, day));
  if (candidate.getTime() >= start.getTime()) return candidate;
  const ncap = new Date(Date.UTC(y + 1, targetMonth + 1, 0)).getUTCDate();
  candidate = new Date(Date.UTC(y + 1, targetMonth, Math.min(args.dayOfMonth, ncap)));
  return candidate;
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

