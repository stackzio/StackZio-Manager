"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PaymentKind, PaymentMethod } from "@stackzio/db";
import { formatDate } from "@stackzio/lib/date";
import { formatMoney, paidPct } from "@stackzio/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPaymentAction, deletePaymentAction } from "@/server/payments/actions";
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: string;
  amount: unknown;
  kind: PaymentKind;
  method: PaymentMethod;
  paidAt: Date;
  reference: string | null;
  note: string | null;
}

interface Props {
  projectId: string;
  payments: Payment[];
  priceTotal: number;
  paid: number;
  outstanding: number;
  currency: string;
  canEdit: boolean;
}

const KIND_OPTIONS: PaymentKind[] = ["ADVANCE", "MILESTONE", "FINAL"];
const METHOD_OPTIONS: PaymentMethod[] = ["BANK", "UPI", "CASH", "CARD", "OTHER"];

export function PaymentsTab({ projectId, payments, priceTotal, paid, outstanding, currency, canEdit }: Props) {
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<PaymentKind>("MILESTONE");
  const [method, setMethod] = useState<PaymentMethod>("BANK");

  const cur = currency as never;
  const pct = paidPct(priceTotal, paid);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      amount: Number(fd.get("amount") ?? 0),
      kind,
      method,
      paidAt: String(fd.get("paidAt") ?? new Date().toISOString().slice(0, 10)),
      reference: String(fd.get("reference") ?? "").trim(),
      note: String(fd.get("note") ?? "").trim(),
    };
    start(async () => {
      const res = await createPaymentAction(projectId, input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Payment recorded");
      (e.target as HTMLFormElement).reset();
      setShowForm(false);
      setKind("MILESTONE");
      setMethod("BANK");
    });
  }

  function onDelete(p: Payment) {
    start(async () => {
      const res = await deletePaymentAction(p.id);
      if (!res.ok) toast.error(res.error ?? "Could not delete");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Money</CardTitle>
          <CardDescription>Track every advance, milestone and final payment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Price total" value={formatMoney(priceTotal, cur)} />
            <Stat label="Paid" value={formatMoney(paid, cur)} accent="success" />
            <Stat label="Outstanding" value={formatMoney(outstanding, cur)} accent={outstanding > 0 ? "warning" : "success"} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Collected</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <Progress value={pct} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Payments</CardTitle>
          {canEdit ? (
            <Button type="button" variant="gradient" size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="size-4" /> Record payment
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && canEdit ? (
            <form onSubmit={onCreate} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as PaymentKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KIND_OPTIONS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paidAt">Paid on</Label>
                <Input
                  id="paidAt"
                  name="paidAt"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="reference">Reference</Label>
                <Input id="reference" name="reference" placeholder="Txn ID, cheque #, …" maxLength={80} />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" name="note" maxLength={500} placeholder="Optional note" />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Record payment
                </Button>
              </div>
            </form>
          ) : null}

          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold tabular-nums">{formatMoney(Number(p.amount), cur)}</p>
                      <Badge variant="secondary">{p.kind}</Badge>
                      <Badge variant="outline">{p.method}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatDate(p.paidAt)}
                      {p.reference ? ` · ${p.reference}` : ""}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  {canEdit ? (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(p)} aria-label="Delete payment">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success" | "warning";
}) {
  const tone = accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
