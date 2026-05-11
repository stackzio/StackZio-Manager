import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/loading-skeleton";
import { FadeIn } from "@/components/motion/fade-in";
import { requirePageOrgFinance } from "@/server/auth/guards";
import { getProfitAndLoss } from "@/server/finance/queries";
import { periodRange, type PeriodPreset } from "@/server/finance/period";
import { PeriodPicker } from "./_components/period-picker";
import { KPIStrip } from "./_components/kpi-strip";
import { TopTables } from "./_components/top-tables";

// Recharts is heavy — load on the client only.
const TrendChart = dynamic(
  () => import("./_components/trend-chart").then((m) => m.TrendChart),
  { loading: () => <Skeleton className="h-72 w-full rounded-xl" /> },
);
const BreakdownDonut = dynamic(
  () => import("./_components/breakdown-donut").then((m) => m.BreakdownDonut),
  { loading: () => <Skeleton className="h-72 w-full rounded-xl" /> },
);

export const metadata: Metadata = { title: "Finance · P&L" };

const PRESETS: ReadonlySet<PeriodPreset> = new Set([
  "this_month",
  "last_month",
  "last_3_months",
  "this_year",
  "custom",
]);

const KIND_COLOR: Record<"SALARY" | "PROJECT" | "BONUS", string> = {
  SALARY: "#6366f1",
  PROJECT: "#10b981",
  BONUS: "#a855f7",
};

const KIND_LABEL: Record<"SALARY" | "PROJECT" | "BONUS", string> = {
  SALARY: "Salary",
  PROJECT: "Project",
  BONUS: "Bonus",
};

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePageOrgFinance();
  const sp = await searchParams;

  const rawPreset = typeof sp.preset === "string" ? sp.preset : undefined;
  const preset: PeriodPreset = (
    rawPreset && PRESETS.has(rawPreset as PeriodPreset) ? rawPreset : "this_month"
  ) as PeriodPreset;

  const fromStr = typeof sp.from === "string" ? sp.from : undefined;
  const toStr = typeof sp.to === "string" ? sp.to : undefined;

  let custom: { from: Date; to: Date } | undefined;
  if (preset === "custom" && fromStr && toStr) {
    const f = new Date(fromStr);
    const t = new Date(toStr);
    if (!Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime())) {
      custom = { from: f, to: t };
    }
  }

  // Fall back to this_month if "custom" was selected without a valid range.
  const effectivePreset: PeriodPreset =
    preset === "custom" && !custom ? "this_month" : preset;

  const period = periodRange(effectivePreset, ctx.org.timezone, new Date(), custom);
  const pl = await getProfitAndLoss(period);

  const categorySlices = pl.byCategory.map((c) => ({
    label: c.name,
    value: Number(c.total.toFixed(2)),
    color: c.color,
  }));
  const kindSlices = pl.byKind.map((k) => ({
    label: KIND_LABEL[k.kind],
    value: Number(k.total.toFixed(2)),
    color: KIND_COLOR[k.kind],
  }));

  // Convert Decimals to plain numbers BEFORE crossing the server→client
  // boundary. The RSC payload serializes Decimals as plain objects, losing
  // their .toFixed() method, which would break KPIStrip on the client.
  const kpi = {
    currency: pl.currency,
    revenue: Number(pl.revenue.toFixed(2)),
    expenses: Number(pl.expenses.toFixed(2)),
    payouts: Number(pl.payouts.toFixed(2)),
    net: Number(pl.net.toFixed(2)),
    prev: {
      revenue: Number(pl.prev.revenue.toFixed(2)),
      expenses: Number(pl.prev.expenses.toFixed(2)),
      payouts: Number(pl.prev.payouts.toFixed(2)),
      net: Number(pl.prev.net.toFixed(2)),
    },
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Finance</p>
            <h1 className="text-2xl font-semibold tracking-tight">Profit &amp; Loss</h1>
            <p className="text-sm text-muted-foreground">
              Revenue minus expenses minus payouts.
            </p>
          </div>
          <PeriodPicker
            preset={effectivePreset}
            from={period.from.toISOString().slice(0, 10)}
            to={period.to.toISOString().slice(0, 10)}
          />
        </div>
      </FadeIn>

      <KPIStrip data={kpi} />

      <TrendChart monthly={pl.monthly} currency={pl.currency} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownDonut
          title="Expenses by category"
          currency={pl.currency}
          slices={categorySlices}
        />
        <BreakdownDonut
          title="Payouts by kind"
          currency={pl.currency}
          slices={kindSlices}
        />
      </div>

      <TopTables byVendor={pl.byVendor} byEarner={pl.byEarner} currency={pl.currency} />
    </div>
  );
}
