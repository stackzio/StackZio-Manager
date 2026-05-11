import type { Metadata } from "next";
import { requirePageOrgFinance } from "@/server/auth/guards";
import { listCategories, listExpenses } from "@/server/finance/queries";
import { catchUpOrgRecurring } from "@/server/finance/recurring/lazy";
import { PageHeader } from "@/components/page-header";
import { ExpensesToolbar } from "./_components/expenses-toolbar";
import {
  ExpensesTable,
  type ExpenseRow,
} from "./_components/expenses-table";

export const metadata: Metadata = { title: "Expenses" };

function toISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateBoundary(v: string | undefined, end: boolean): Date | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  return new Date(`${v}T${end ? "23:59:59" : "00:00:00"}Z`);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePageOrgFinance();
  // Lazy catch-up: materialize any due recurring rules before fetching the
  // expense list, so a newly-arrived row from a recurring rule appears on
  // this very render. Awaited because it's cheap (one indexed scan) when
  // nothing's due — the common case.
  await catchUpOrgRecurring(ctx.org.id);
  const sp = await searchParams;

  const fromStr = typeof sp.from === "string" ? sp.from : undefined;
  const toStr = typeof sp.to === "string" ? sp.to : undefined;
  const catsStr = typeof sp.cats === "string" ? sp.cats : undefined;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined;

  const from = parseDateBoundary(fromStr, false);
  const to = parseDateBoundary(toStr, true);
  const categoryIds = catsStr?.split(",").filter(Boolean);

  const [rawRows, categories] = await Promise.all([
    listExpenses({ from, to, categoryIds, vendorQuery: q, take: 100 }),
    listCategories(),
  ]);

  // Serialize Decimals for the client table.
  const rows: ExpenseRow[] = rawRows.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    categoryName: r.category.name,
    categoryColor: r.category.color,
    categoryIcon: r.category.icon,
    vendor: r.vendor,
    amount: r.amount.toFixed(2),
    amountNumber: Number(r.amount),
    currency: r.currency,
    spentAt: r.spentAt,
    spentAtISO: toISODate(r.spentAt),
    method: r.method,
    reference: r.reference,
    note: r.note,
    receiptUrl: r.receiptUrl,
    ruleId: r.ruleId,
  }));

  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
  }));

  const isFiltered = !!(from || to || categoryIds?.length || q);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expenses"
        description="Track every outflow — vendors, ads, software, rent."
        actions={
          <a
            href="/expenses/recurring"
            className="group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" />
            Recurring rules
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        }
      />
      <ExpensesToolbar categories={cats} />
      <ExpensesTable
        rows={rows}
        categories={cats}
        currency={ctx.org.defaultCurrency}
        isFiltered={isFiltered}
      />
    </div>
  );
}
