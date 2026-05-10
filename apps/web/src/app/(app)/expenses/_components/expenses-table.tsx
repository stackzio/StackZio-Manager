"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Plus, Receipt } from "lucide-react";
import { formatDate } from "@stackzio/lib/date";
import { formatMoney } from "@stackzio/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { CategoryChip } from "@/components/finance/category-chip";
import {
  ExpenseForm,
  type ExpenseFormCategory,
  type ExpenseFormInitial,
} from "./expense-form";

export interface ExpenseRow {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  vendor: string | null;
  amount: string; // already-stringified Decimal
  amountNumber: number;
  currency: string;
  spentAt: Date;
  spentAtISO: string; // YYYY-MM-DD
  method: "BANK" | "CASH" | "UPI" | "CARD" | "OTHER";
  reference: string | null;
  note: string | null;
  receiptUrl: string | null;
}

const METHOD_LABEL: Record<ExpenseRow["method"], string> = {
  BANK: "Bank",
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

interface Props {
  rows: ExpenseRow[];
  categories: ExpenseFormCategory[];
  currency: string;
  isFiltered?: boolean;
}

export function ExpensesTable({ rows, categories, currency, isFiltered }: Props) {
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [creating, setCreating] = useState(false);

  const columns = useMemo<ColumnDef<ExpenseRow>[]>(
    () => [
      {
        id: "spentAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDate(row.original.spentAt)}
          </span>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <CategoryChip
              name={r.categoryName}
              color={r.categoryColor}
              icon={r.categoryIcon}
            />
          );
        },
      },
      {
        id: "vendor",
        header: "Vendor",
        cell: ({ row }) => (
          <span className="block max-w-[200px] truncate text-sm">
            {row.original.vendor ?? "—"}
          </span>
        ),
      },
      {
        id: "amount",
        header: () => <span className="block text-right">Amount</span>,
        cell: ({ row }) => (
          <span className="block text-right text-sm font-semibold tabular-nums">
            {formatMoney(row.original.amountNumber, row.original.currency as never)}
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
      {
        id: "note",
        header: "Note",
        cell: ({ row }) => {
          const r = row.original;
          const txt = r.note ?? r.reference ?? "";
          return (
            <span
              className="block max-w-[240px] truncate text-xs text-muted-foreground"
              title={txt || undefined}
            >
              {txt || "—"}
            </span>
          );
        },
      },
    ],
    // currency is captured via row.original.currency
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const initial: ExpenseFormInitial | null = editing
    ? {
        id: editing.id,
        categoryId: editing.categoryId,
        vendor: editing.vendor,
        amount: editing.amount,
        spentAt: editing.spentAtISO,
        method: editing.method,
        reference: editing.reference,
        note: editing.note,
        receiptUrl: editing.receiptUrl,
      }
    : null;

  return (
    <>
      {rows.length === 0 ? (
        <EmptyExpenses
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
                  aria-label={`Edit expense from ${formatDate(row.original.spentAt)}`}
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

      {/* Edit drawer (only mounted when editing) */}
      {initial ? (
        <ExpenseForm
          open={!!editing}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
          categories={categories}
          initial={initial}
        />
      ) : null}

      {/* Create drawer from empty-state CTA */}
      {creating ? (
        <ExpenseForm
          open={creating}
          onOpenChange={(o) => setCreating(o)}
          categories={categories}
          initial={null}
        />
      ) : null}
    </>
  );
}

function EmptyExpenses({
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
          <Receipt className="size-6" />
        </div>
        <h3 className="text-base font-semibold">
          {isFiltered ? "No expenses match those filters" : "Add your first expense"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isFiltered
            ? "Try a different category, date range or vendor."
            : "Track every outflow — vendors, ads, software, rent. Your P&L will thank you."}
        </p>
        {!isFiltered ? (
          <Button variant="gradient" onClick={onAdd}>
            <Plus className="size-4" /> Add expense
          </Button>
        ) : null}
      </div>
    </div>
  );
}
