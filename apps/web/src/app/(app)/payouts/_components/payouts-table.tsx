"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Plus, Wallet } from "lucide-react";
import { formatDate } from "@stackzio/lib/date";
import { formatMoney } from "@stackzio/lib/money";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { KindChip } from "@/components/finance/kind-chip";
import {
  PayoutForm,
  type PayoutFormInitial,
  type PayoutFormMember,
  type PayoutFormProject,
  type PayoutKind,
} from "./payout-form";

export interface PayoutRow {
  id: string;
  memberUserId: string;
  memberName: string | null;
  memberEmail: string;
  memberImage: string | null;
  kind: PayoutKind;
  projectId: string | null;
  projectName: string | null;
  amount: string;
  amountNumber: number;
  currency: string;
  paidAt: Date;
  paidAtISO: string;
  periodMonthISO: string | null;
  method: "BANK" | "CASH" | "UPI" | "CARD" | "OTHER";
  reference: string | null;
  note: string | null;
}

const METHOD_LABEL: Record<PayoutRow["method"], string> = {
  BANK: "Bank",
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

interface Props {
  rows: PayoutRow[];
  members: PayoutFormMember[];
  projects: PayoutFormProject[];
  currency: string;
  isFiltered?: boolean;
}

function initials(name: string | null, email: string): string {
  const src = (name && name.trim()) || email;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function PayoutsTable({
  rows,
  members,
  projects,
  currency,
  isFiltered,
}: Props) {
  const [editing, setEditing] = useState<PayoutRow | null>(null);
  const [creating, setCreating] = useState(false);

  const columns = useMemo<ColumnDef<PayoutRow>[]>(
    () => [
      {
        id: "paidAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDate(row.original.paidAt)}
          </span>
        ),
      },
      {
        id: "member",
        header: "Member",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span className="flex items-center gap-2">
              <Avatar className="size-7">
                {r.memberImage ? (
                  <AvatarImage
                    src={r.memberImage}
                    alt={r.memberName ?? r.memberEmail}
                  />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {initials(r.memberName, r.memberEmail)}
                </AvatarFallback>
              </Avatar>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium">
                  {r.memberName ?? r.memberEmail}
                </span>
                {r.memberName ? (
                  <span className="text-[11px] text-muted-foreground">
                    {r.memberEmail}
                  </span>
                ) : null}
              </span>
            </span>
          );
        },
      },
      {
        id: "kind",
        header: "Kind",
        cell: ({ row }) => <KindChip kind={row.original.kind} />,
      },
      {
        id: "project",
        header: "Project",
        cell: ({ row }) => (
          <span className="block max-w-[200px] truncate text-sm">
            {row.original.projectName ?? "—"}
          </span>
        ),
      },
      {
        id: "amount",
        header: () => <span className="block text-right">Amount</span>,
        cell: ({ row }) => (
          <span className="block text-right text-sm font-semibold tabular-nums">
            {formatMoney(
              row.original.amountNumber,
              row.original.currency as never,
            )}
          </span>
        ),
      },
      {
        id: "method",
        header: "Method",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[11px]">
            {METHOD_LABEL[row.original.method]}
          </Badge>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const initial: PayoutFormInitial | null = editing
    ? {
        id: editing.id,
        memberUserId: editing.memberUserId,
        kind: editing.kind,
        projectId: editing.projectId,
        amount: editing.amount,
        paidAt: editing.paidAtISO,
        periodMonth: editing.periodMonthISO,
        method: editing.method,
        reference: editing.reference,
        note: editing.note,
      }
    : null;

  // reason: `currency` is reserved for future filtering UX; consumed via row.original.currency above.
  void currency;

  return (
    <>
      {rows.length === 0 ? (
        <EmptyPayouts
          onAdd={() => setCreating(true)}
          isFiltered={isFiltered ?? false}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="whitespace-nowrap px-4 py-3 text-left"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setEditing(row.original)}
                  className={cn(
                    "cursor-pointer border-t transition-colors hover:bg-accent/40 focus-within:bg-accent/40",
                  )}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditing(row.original);
                    }
                  }}
                  role="button"
                  aria-label={`Edit payout from ${formatDate(row.original.paidAt)}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {initial ? (
        <PayoutForm
          open={!!editing}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
          members={members}
          projects={projects}
          initial={initial}
        />
      ) : null}

      {creating ? (
        <PayoutForm
          open={creating}
          onOpenChange={(o) => setCreating(o)}
          members={members}
          projects={projects}
          initial={null}
        />
      ) : null}
    </>
  );
}

function EmptyPayouts({
  onAdd,
  isFiltered,
}: {
  onAdd: () => void;
  isFiltered: boolean;
}) {
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
        <div className="rounded-full bg-brand-gradient p-3 text-primary-foreground shadow-lg">
          <Wallet className="size-6" />
        </div>
        <h3 className="text-base font-semibold">
          {isFiltered
            ? "No payouts match those filters"
            : "No payouts yet — record your first"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isFiltered
            ? "Try a different member, kind or date range."
            : "Salaries, project payouts, and bonuses all live here."}
        </p>
        {!isFiltered ? (
          <Button variant="gradient" onClick={onAdd}>
            <Plus className="size-4" /> Record payout
          </Button>
        ) : null}
      </div>
    </div>
  );
}
