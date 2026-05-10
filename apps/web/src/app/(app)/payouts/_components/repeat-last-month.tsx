"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { repeatLastMonthSalariesAction } from "@/server/finance/payout-actions";

export interface RepeatLastMonthSalary {
  memberUserId: string;
  memberName: string | null;
  memberEmail: string;
  memberImage: string | null;
  amount: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salaries: RepeatLastMonthSalary[];
  /** YYYY-MM — the target month we're recording payouts for (usually this month). */
  forMonth: string;
  /** YYYY-MM — the source month (last month) for display only. */
  fromMonth: string;
}

interface PickState {
  checked: boolean;
  amount: string;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function initials(name: string | null, email: string): string {
  const src = (name && name.trim()) || email;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function formatMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  if (!y || !m) return yyyymm;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

export function RepeatLastMonth({
  open,
  onOpenChange,
  salaries,
  forMonth,
  fromMonth,
}: Props) {
  const router = useRouter();
  const initialState = useMemo<Record<string, PickState>>(() => {
    const m: Record<string, PickState> = {};
    for (const s of salaries) {
      m[s.memberUserId] = { checked: true, amount: s.amount };
    }
    return m;
  }, [salaries]);

  const [picks, setPicks] = useState<Record<string, PickState>>(initialState);
  const [paidAt, setPaidAt] = useState<string>(todayISO());
  const [pending, setPending] = useState(false);

  function setChecked(id: string, checked: boolean) {
    setPicks((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { amount: "0.00" }), checked },
    }));
  }

  function setAmount(id: string, amount: string) {
    setPicks((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { checked: true }), amount },
    }));
  }

  const selected = salaries.filter((s) => picks[s.memberUserId]?.checked);
  const totalSelected = selected.length;

  async function onSubmit() {
    if (pending) return;
    if (totalSelected === 0) {
      toast.error("Pick at least one member");
      return;
    }
    const invalid = selected.find((s) => {
      const amt = picks[s.memberUserId]?.amount ?? "";
      return !AMOUNT_RE.test(amt) || Number(amt) <= 0;
    });
    if (invalid) {
      toast.error(
        `Enter a valid amount for ${invalid.memberName ?? invalid.memberEmail}`,
      );
      return;
    }
    if (!paidAt) {
      toast.error("Pick a payout date");
      return;
    }

    setPending(true);
    try {
      const res = await repeatLastMonthSalariesAction({
        picks: selected.map((s) => ({
          memberUserId: s.memberUserId,
          amount: picks[s.memberUserId]!.amount,
        })),
        forMonth,
        paidAt,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Recorded ${res.count} salaries`);
      onOpenChange(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-4" />
            Repeat last month&apos;s salaries
          </DialogTitle>
          <DialogDescription>
            Recording salaries for <strong>{formatMonth(forMonth)}</strong> using
            the same members and amounts you paid in{" "}
            <strong>{formatMonth(fromMonth)}</strong>. Uncheck or edit anyone.
          </DialogDescription>
        </DialogHeader>

        {salaries.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No salaries were recorded last month — record the first one manually
            and this button will light up next time.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {totalSelected} of {salaries.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => {
                      const all: Record<string, PickState> = {};
                      for (const s of salaries) {
                        all[s.memberUserId] = {
                          checked: true,
                          amount: picks[s.memberUserId]?.amount ?? s.amount,
                        };
                      }
                      setPicks(all);
                    }}
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => {
                      const none: Record<string, PickState> = {};
                      for (const s of salaries) {
                        none[s.memberUserId] = {
                          checked: false,
                          amount: picks[s.memberUserId]?.amount ?? s.amount,
                        };
                      }
                      setPicks(none);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="divide-y rounded-xl border bg-card">
                {salaries.map((s) => {
                  const state = picks[s.memberUserId] ?? {
                    checked: true,
                    amount: s.amount,
                  };
                  return (
                    <div
                      key={s.memberUserId}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <Checkbox
                        id={`pick-${s.memberUserId}`}
                        checked={state.checked}
                        onCheckedChange={(v) =>
                          setChecked(s.memberUserId, v === true)
                        }
                      />
                      <Avatar className="size-8">
                        {s.memberImage ? (
                          <AvatarImage
                            src={s.memberImage}
                            alt={s.memberName ?? s.memberEmail}
                          />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {initials(s.memberName, s.memberEmail)}
                        </AvatarFallback>
                      </Avatar>
                      <Label
                        htmlFor={`pick-${s.memberUserId}`}
                        className="flex min-w-0 flex-1 cursor-pointer flex-col leading-tight"
                      >
                        <span className="truncate text-sm font-medium">
                          {s.memberName ?? s.memberEmail}
                        </span>
                        {s.memberName ? (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {s.memberEmail}
                          </span>
                        ) : null}
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={state.amount}
                        onChange={(e) =>
                          setAmount(s.memberUserId, e.target.value)
                        }
                        disabled={!state.checked}
                        className="h-9 w-32 tabular-nums"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="paidAt" className="text-xs text-muted-foreground">
                  Paid on
                </Label>
                <Input
                  id="paidAt"
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="h-9 w-[160px]"
                />
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="gradient"
            onClick={onSubmit}
            disabled={pending || salaries.length === 0 || totalSelected === 0}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            {pending
              ? "Recording…"
              : `Record ${totalSelected || ""} ${totalSelected === 1 ? "salary" : "salaries"}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
