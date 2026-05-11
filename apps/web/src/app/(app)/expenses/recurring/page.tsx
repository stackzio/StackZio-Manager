import type { Metadata } from "next";
import { Repeat } from "lucide-react";
import { requirePageOrgFinance } from "@/server/auth/guards";
import { listCategories } from "@/server/finance/queries";
import { listExpenseRules } from "@/server/finance/recurring/queries";
import { catchUpOrgRecurring } from "@/server/finance/recurring/lazy";
import { PageHeader } from "@/components/page-header";
import { RecurringList, type RecurringRow } from "./_components/recurring-list";

export const metadata: Metadata = { title: "Recurring expenses" };

function toISODate(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function RecurringExpensesPage() {
  const ctx = await requirePageOrgFinance();
  // Run any catch-up so users see the freshest nextRunAt values.
  await catchUpOrgRecurring(ctx.org.id);

  const [rules, categories] = await Promise.all([
    listExpenseRules(),
    listCategories(),
  ]);

  const rows: RecurringRow[] = rules.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    categoryName: r.category.name,
    categoryColor: r.category.color,
    categoryIcon: r.category.icon,
    vendor: r.vendor,
    amount: r.amount.toFixed(2),
    amountNumber: Number(r.amount),
    currency: r.currency,
    method: r.method,
    reference: r.reference,
    note: r.note,
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth,
    monthOfYear: r.monthOfYear,
    startsOn: toISODate(r.startsOn)!,
    endsOn: toISODate(r.endsOn),
    active: r.active,
    lastRunAt: r.lastRunAt,
    nextRunAt: r.nextRunAt,
    runCount: r._count.expenses,
  }));

  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
  }));

  const activeCount = rows.filter((r) => r.active).length;
  const monthlyOutflow = rows
    .filter((r) => r.active && r.frequency === "MONTHLY")
    .reduce((s, r) => s + r.amountNumber, 0);
  const yearlyOutflow = rows
    .filter((r) => r.active && r.frequency === "YEARLY")
    .reduce((s, r) => s + r.amountNumber, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring expenses"
        description="Set a monthly or yearly cadence — each cycle, an expense row is created automatically and you get a notification."
        breadcrumbs={
          <span className="flex items-center gap-1">
            <a className="hover:text-foreground" href="/expenses">
              Expenses
            </a>
            <span aria-hidden>/</span>
            <span>Recurring</span>
          </span>
        }
      />

      <RecurringList
        rows={rows}
        categories={cats}
        currency={ctx.org.defaultCurrency}
        kpi={{ activeCount, monthlyOutflow, yearlyOutflow }}
      />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Repeat className="size-3" /> The cron runs daily at 02:00 UTC; opening this
        page also triggers a catch-up so anything overdue surfaces immediately.
      </p>
    </div>
  );
}
