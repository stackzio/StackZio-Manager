"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Briefcase, Gift, Loader2, Save, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createPayoutAction,
  deletePayoutAction,
  updatePayoutAction,
} from "@/server/finance/payout-actions";
import {
  PAYOUT_METHODS,
  type UpsertPayoutInput,
} from "@/server/finance/schemas";

export type PayoutKind = "SALARY" | "PROJECT" | "BONUS";
type Method = (typeof PAYOUT_METHODS)[number];

const METHOD_LABEL: Record<Method, string> = {
  BANK: "Bank transfer",
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

export interface PayoutFormMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface PayoutFormProject {
  id: string;
  name: string;
}

export interface PayoutFormInitial {
  id: string;
  memberUserId: string;
  kind: PayoutKind;
  projectId: string | null;
  amount: string;
  paidAt: string; // YYYY-MM-DD
  periodMonth: string | null; // YYYY-MM
  method: Method;
  reference: string | null;
  note: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: PayoutFormMember[];
  projects: PayoutFormProject[];
  /** When provided we run edit mode, otherwise create mode. */
  initial?: PayoutFormInitial | null;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function thisMonthISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function normalizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const num = Number(cleaned);
  if (Number.isNaN(num) || num < 0) return "";
  return num.toFixed(2);
}

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

function initials(name: string | null, email: string): string {
  const src = (name && name.trim()) || email;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function PayoutForm({
  open,
  onOpenChange,
  members,
  projects,
  initial,
}: Props) {
  const router = useRouter();
  const mode = initial ? "edit" : "create";

  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [kind, setKind] = useState<PayoutKind>(initial?.kind ?? "SALARY");
  const [memberUserId, setMemberUserId] = useState<string>(
    initial?.memberUserId ?? members[0]?.id ?? "",
  );
  const [projectId, setProjectId] = useState<string>(
    initial?.projectId ?? projects[0]?.id ?? "",
  );
  const [amount, setAmount] = useState<string>(initial?.amount ?? "");
  const [method, setMethod] = useState<Method>(initial?.method ?? "BANK");
  const [paidAt, setPaidAt] = useState<string>(initial?.paidAt ?? todayISO());
  const [periodMonth, setPeriodMonth] = useState<string>(
    initial?.periodMonth ?? thisMonthISO(),
  );
  const [reference, setReference] = useState<string>(initial?.reference ?? "");
  const [note, setNote] = useState<string>(initial?.note ?? "");
  const [monthError, setMonthError] = useState<string | null>(null);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === memberUserId) ?? null,
    [members, memberUserId],
  );
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  function onKindChange(next: string) {
    const k = next as PayoutKind;
    setKind(k);
    setMonthError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    setMonthError(null);

    if (!memberUserId) {
      toast.error("Pick a member");
      return;
    }
    if (!amount || !AMOUNT_RE.test(amount) || Number(amount) <= 0) {
      toast.error("Enter a positive amount with up to 2 decimals");
      return;
    }
    if (!paidAt) {
      toast.error("Pick a payout date");
      return;
    }
    if (kind === "SALARY" && !periodMonth) {
      toast.error("Pick the salary month");
      setMonthError("Month is required");
      return;
    }
    if (kind === "PROJECT" && !projectId) {
      toast.error("Pick a project");
      return;
    }

    const input: UpsertPayoutInput = {
      memberUserId,
      kind,
      amount,
      paidAt,
      method,
      reference: reference.trim() || "",
      note: note.trim() || "",
      ...(kind === "SALARY" ? { periodMonth } : {}),
      ...(kind === "PROJECT" ? { projectId } : {}),
    };

    setPending(true);
    try {
      const res =
        mode === "create"
          ? await createPayoutAction(input)
          : await updatePayoutAction(initial!.id, input);
      if (!res.ok) {
        toast.error(res.error);
        if (/already recorded/i.test(res.error)) {
          setMonthError(res.error);
        }
        return;
      }

      if (mode === "create") {
        const memberLabel =
          (selectedMember?.name && selectedMember.name.trim()) ||
          selectedMember?.email ||
          "member";
        if (kind === "SALARY") {
          toast.success(`Salary recorded for ${memberLabel}`);
        } else if (kind === "PROJECT") {
          toast.success(`Payout recorded — ${selectedProject?.name ?? "project"}`);
        } else {
          toast.success("Bonus recorded");
        }
      } else {
        toast.success("Payout updated");
      }

      onOpenChange(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!initial || deleting) return;
    const ok = window.confirm("Delete this payout? This can't be undone.");
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await deletePayoutAction(initial.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Payout deleted");
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
            {mode === "create" ? "Record payout" : "Edit payout"}
          </DialogTitle>
          <DialogDescription>
            Salaries, project payouts, and bonuses — keep your team paid and your
            P&amp;L honest.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <Tabs value={kind} onValueChange={onKindChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="SALARY" className="gap-1.5">
                <Wallet className="size-3.5" />
                Salary
              </TabsTrigger>
              <TabsTrigger value="PROJECT" className="gap-1.5">
                <Briefcase className="size-3.5" />
                Project
              </TabsTrigger>
              <TabsTrigger value="BONUS" className="gap-1.5">
                <Gift className="size-3.5" />
                Bonus
              </TabsTrigger>
            </TabsList>

            {/* SALARY */}
            <TabsContent value="SALARY" className="space-y-4">
              <MemberField
                value={memberUserId}
                onChange={setMemberUserId}
                members={members}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="For month" id="periodMonth" required>
                  <Input
                    id="periodMonth"
                    type="month"
                    required
                    value={periodMonth}
                    onChange={(e) => {
                      setPeriodMonth(e.target.value);
                      setMonthError(null);
                    }}
                  />
                  {monthError ? (
                    <p className="text-xs text-destructive">{monthError}</p>
                  ) : null}
                </Field>
                <AmountField value={amount} setValue={setAmount} />
                <PaidAtField value={paidAt} setValue={setPaidAt} />
                <MethodField value={method} setValue={setMethod} />
                <ReferenceField
                  value={reference}
                  setValue={setReference}
                  className="sm:col-span-2"
                />
                <NoteField
                  value={note}
                  setValue={setNote}
                  className="sm:col-span-2"
                />
              </div>
            </TabsContent>

            {/* PROJECT */}
            <TabsContent value="PROJECT" className="space-y-4">
              <MemberField
                value={memberUserId}
                onChange={setMemberUserId}
                members={members}
              />
              <Field label="Project" id="projectId" required>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="projectId">
                    <SelectValue placeholder="Pick a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No active projects
                      </div>
                    ) : (
                      projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <AmountField value={amount} setValue={setAmount} />
                <PaidAtField value={paidAt} setValue={setPaidAt} />
                <MethodField value={method} setValue={setMethod} />
                <ReferenceField
                  value={reference}
                  setValue={setReference}
                  className="sm:col-span-2"
                />
                <NoteField
                  value={note}
                  setValue={setNote}
                  className="sm:col-span-2"
                />
              </div>
            </TabsContent>

            {/* BONUS */}
            <TabsContent value="BONUS" className="space-y-4">
              <MemberField
                value={memberUserId}
                onChange={setMemberUserId}
                members={members}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <AmountField value={amount} setValue={setAmount} />
                <PaidAtField value={paidAt} setValue={setPaidAt} />
                <MethodField value={method} setValue={setMethod} />
                <ReferenceField value={reference} setValue={setReference} />
                <Field
                  label="Reason"
                  id="bonusReason"
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="bonusReason"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Why this bonus? Performance, milestone, festive…"
                    maxLength={500}
                    className="min-h-[80px]"
                  />
                </Field>
              </div>
            </TabsContent>
          </Tabs>

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
                  ? "Record payout"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberField({
  value,
  onChange,
  members,
}: {
  value: string;
  onChange: (id: string) => void;
  members: PayoutFormMember[];
}) {
  const selected = members.find((m) => m.id === value);
  return (
    <Field label="Member" id="memberUserId" required>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="memberUserId">
          <SelectValue placeholder="Pick a member">
            {selected ? (
              <MemberOption member={selected} compact />
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {members.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No members
            </div>
          ) : (
            members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <MemberOption member={m} />
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </Field>
  );
}

function MemberOption({
  member,
  compact,
}: {
  member: PayoutFormMember;
  compact?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <Avatar className="size-6">
        {member.image ? (
          <AvatarImage src={member.image} alt={member.name ?? member.email} />
        ) : null}
        <AvatarFallback className="text-[10px]">
          {initials(member.name, member.email)}
        </AvatarFallback>
      </Avatar>
      <span className="flex flex-col text-left leading-tight">
        <span className="text-sm font-medium">
          {member.name ?? member.email}
        </span>
        {!compact && member.name ? (
          <span className="text-[11px] text-muted-foreground">
            {member.email}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function AmountField({
  value,
  setValue,
}: {
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <Field label="Amount" id="amount" required>
      <Input
        id="amount"
        name="amount"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => setValue(normalizeAmount(e.target.value))}
        placeholder="0.00"
        className="tabular-nums"
      />
    </Field>
  );
}

function PaidAtField({
  value,
  setValue,
}: {
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <Field label="Paid on" id="paidAt" required>
      <Input
        id="paidAt"
        type="date"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </Field>
  );
}

function MethodField({
  value,
  setValue,
}: {
  value: Method;
  setValue: (m: Method) => void;
}) {
  return (
    <Field label="Method" id="method">
      <Select value={value} onValueChange={(v) => setValue(v as Method)}>
        <SelectTrigger id="method">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYOUT_METHODS.map((m) => (
            <SelectItem key={m} value={m}>
              {METHOD_LABEL[m]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function ReferenceField({
  value,
  setValue,
  className,
}: {
  value: string;
  setValue: (v: string) => void;
  className?: string;
}) {
  return (
    <Field label="Reference" id="reference" className={className}>
      <Input
        id="reference"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Transaction ID, UTR…"
        maxLength={120}
      />
    </Field>
  );
}

function NoteField({
  value,
  setValue,
  className,
}: {
  value: string;
  setValue: (v: string) => void;
  className?: string;
}) {
  return (
    <Field label="Note" id="note" className={className}>
      <Textarea
        id="note"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Anything worth remembering."
        maxLength={500}
        className="min-h-[80px]"
      />
    </Field>
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
