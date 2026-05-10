"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
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
// TODO(phase-14): switch ImageUpload `kind` from "project-doc" to "expense-receipt"
// once the upload pipeline learns about expense receipts. See line ~263 below.
import { ImageUpload } from "@/components/upload/image-upload";
import {
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from "@/server/finance/expense-actions";
import {
  EXPENSE_METHODS,
  type UpsertExpenseInput,
} from "@/server/finance/schemas";

type Method = (typeof EXPENSE_METHODS)[number];

const METHOD_LABEL: Record<Method, string> = {
  BANK: "Bank transfer",
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

export interface ExpenseFormCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface ExpenseFormInitial {
  id: string;
  categoryId: string;
  vendor: string | null;
  amount: string; // formatted "0.00"
  spentAt: string; // YYYY-MM-DD
  method: Method;
  reference: string | null;
  note: string | null;
  receiptUrl: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseFormCategory[];
  /** When provided we run edit mode, otherwise create mode. */
  initial?: ExpenseFormInitial | null;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeAmount(raw: string): string {
  // Strip everything but digits and dot; clamp to 2 decimals; default to "0.00".
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const num = Number(cleaned);
  if (Number.isNaN(num) || num < 0) return "";
  return num.toFixed(2);
}

export function ExpenseForm({ open, onOpenChange, categories, initial }: Props) {
  const router = useRouter();
  const mode = initial ? "edit" : "create";

  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // We keep these in controlled state because the category select and the
  // receipt uploader are not simple inputs.
  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [method, setMethod] = useState<Method>(initial?.method ?? "BANK");
  const [amount, setAmount] = useState<string>(initial?.amount ?? "");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(
    initial?.receiptUrl ?? null,
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const vendor = String(fd.get("vendor") ?? "").trim();
    const reference = String(fd.get("reference") ?? "").trim();
    const note = String(fd.get("note") ?? "").trim();
    const spentAt = String(fd.get("spentAt") ?? "").trim();

    if (!categoryId) {
      toast.error("Pick a category");
      return;
    }
    if (!amount) {
      toast.error("Enter an amount");
      return;
    }
    if (!spentAt) {
      toast.error("Pick a date");
      return;
    }

    const input: UpsertExpenseInput = {
      categoryId,
      vendor: vendor || "",
      amount,
      spentAt,
      method,
      reference: reference || "",
      note: note || "",
      receiptUrl: receiptUrl ?? "",
    };

    setPending(true);
    try {
      const res =
        mode === "create"
          ? await createExpenseAction(input)
          : await updateExpenseAction(initial!.id, input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "create" ? "Expense recorded" : "Expense updated");
      onOpenChange(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!initial || deleting) return;
    const ok = window.confirm(
      "Delete this expense? This can't be undone.",
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await deleteExpenseAction(initial.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Expense deleted");
      onOpenChange(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Record expense" : "Edit expense"}
          </DialogTitle>
          <DialogDescription>
            Every outflow — ads, software, rent, travel — keeps your P&amp;L
            honest.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Category" id="categoryId" required>
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
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vendor" id="vendor">
              <Input
                id="vendor"
                name="vendor"
                placeholder="Stripe, Meta, Adobe…"
                defaultValue={initial?.vendor ?? ""}
                maxLength={120}
              />
            </Field>
            <Field label="Amount" id="amount" required>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={(e) => setAmount(normalizeAmount(e.target.value))}
                placeholder="0.00"
                className="tabular-nums"
              />
            </Field>
            <Field label="Spent on" id="spentAt" required>
              <Input
                id="spentAt"
                name="spentAt"
                type="date"
                required
                defaultValue={initial?.spentAt ?? todayISO()}
              />
            </Field>
            <Field label="Method" id="method">
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
            </Field>
            <Field label="Reference" id="reference" className="sm:col-span-2">
              <Input
                id="reference"
                name="reference"
                placeholder="Invoice number, transaction ID…"
                defaultValue={initial?.reference ?? ""}
                maxLength={120}
              />
            </Field>
            <Field label="Note" id="note" className="sm:col-span-2">
              <Textarea
                id="note"
                name="note"
                placeholder="Anything worth remembering."
                defaultValue={initial?.note ?? ""}
                maxLength={500}
                className="min-h-[80px]"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <Label>Receipt</Label>
            {/* TODO(phase-14): switch kind to "expense-receipt" once the
                uploads pipeline learns the new kind. For now we piggyback on
                "project-doc" so PDFs/images are accepted at 25 MB. */}
            <ImageUpload
              kind="project-doc"
              currentUrl={receiptUrl}
              fallbackText="RC"
              onUploaded={(url) => setReceiptUrl(url)}
              rounded="lg"
              size="md"
            />
          </div>

          <DialogFooter className="gap-2">
            {mode === "edit" ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={pending || deleting}
                className="mr-auto text-destructive hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending || deleting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={pending || deleting}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {pending
                ? "Saving…"
                : mode === "create"
                  ? "Record expense"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  required,
  className,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}
