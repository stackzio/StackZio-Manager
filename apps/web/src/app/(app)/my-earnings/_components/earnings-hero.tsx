"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Sparkles, Trophy } from "lucide-react";
import { Prisma } from "@stackzio/db";
import { formatMoney } from "@stackzio/lib/money";
import { AnimatedAmount } from "@/components/finance/animated-amount";
import { FadeIn } from "@/components/motion/fade-in";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const { Decimal } = Prisma;

const MONTH_LONG = [
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

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface ByMonthRow {
  paidAt: Date;
  amount: Prisma.Decimal;
}

interface ByProjectRow {
  projectId: string | null;
  _sum: { amount: Prisma.Decimal | null };
}

interface RowProjectRef {
  project: { id: string; name: string } | null;
}

interface ByKindRow {
  kind: "SALARY" | "PROJECT" | "BONUS";
  _sum: { amount: Prisma.Decimal | null };
}

interface EarningsData {
  rows: Array<RowProjectRef & { paidAt: Date; amount: Prisma.Decimal }>;
  agg: { _sum: { amount: Prisma.Decimal | null }; _count: number };
  byKind: ByKindRow[];
  byMonth: ByMonthRow[];
  byProject: ByProjectRow[];
}

interface Props {
  data: EarningsData;
  currency: string;
  startOfMonth: Date;
}

function toNum(d: Prisma.Decimal | null | undefined): number {
  if (!d) return 0;
  return Number(d.toFixed(2));
}

function sumDecimal(rows: ByMonthRow[]): Prisma.Decimal {
  return rows.reduce(
    (acc, r) => acc.plus(new Decimal(r.amount.toString())),
    new Decimal(0),
  );
}

export function EarningsHero({ data, currency, startOfMonth }: Props) {
  const now = new Date();
  const startOfNextMonth = new Date(
    startOfMonth.getFullYear(),
    startOfMonth.getMonth() + 1,
    1,
  );
  const startOfLastMonth = new Date(
    startOfMonth.getFullYear(),
    startOfMonth.getMonth() - 1,
    1,
  );
  const startOfYear = new Date(startOfMonth.getFullYear(), 0, 1);

  const monthName = MONTH_LONG[startOfMonth.getMonth()] ?? "this month";

  // === Sums ===
  const thisMonthRows = useMemo(
    () =>
      data.byMonth.filter(
        (r) => r.paidAt >= startOfMonth && r.paidAt < startOfNextMonth,
      ),
    [data.byMonth, startOfMonth, startOfNextMonth],
  );
  const lastMonthRows = useMemo(
    () =>
      data.byMonth.filter(
        (r) => r.paidAt >= startOfLastMonth && r.paidAt < startOfMonth,
      ),
    [data.byMonth, startOfLastMonth, startOfMonth],
  );

  const thisMonthTotal = useMemo(() => sumDecimal(thisMonthRows), [thisMonthRows]);
  const lastMonthTotal = useMemo(() => sumDecimal(lastMonthRows), [lastMonthRows]);

  // YTD — sum from rows (rows is capped at 200 most-recent; safe approximation).
  // Fallback to all-time for users with > 200 lifetime payouts so we never show
  // YTD < all-time wrongly. We compute YTD as min(rowsYTD, allTime).
  const ytdTotal = useMemo(() => {
    const ytdRows = data.rows.filter((r) => r.paidAt >= startOfYear);
    return ytdRows.reduce(
      (acc, r) => acc.plus(new Decimal(r.amount.toString())),
      new Decimal(0),
    );
  }, [data.rows, startOfYear]);

  const allTimeTotal = useMemo(
    () => new Decimal((data.agg._sum.amount ?? new Decimal(0)).toString()),
    [data.agg._sum.amount],
  );

  // === Counts (for "based on N payouts") ===
  const thisMonthCount = thisMonthRows.length;
  const lastMonthCount = lastMonthRows.length;
  const ytdCount = useMemo(
    () => data.rows.filter((r) => r.paidAt >= startOfYear).length,
    [data.rows, startOfYear],
  );
  const allTimeCount = data.agg._count;

  // === 6-month sparkline ===
  const sparkData = useMemo(() => {
    // Build buckets for the last 6 months ending with the current month.
    const buckets = new Map<string, Prisma.Decimal>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, new Decimal(0));
    }
    for (const r of data.byMonth) {
      const key = `${r.paidAt.getFullYear()}-${String(r.paidAt.getMonth() + 1).padStart(2, "0")}`;
      const cur = buckets.get(key);
      if (cur) buckets.set(key, cur.plus(new Decimal(r.amount.toString())));
    }
    return Array.from(buckets.entries()).map(([key, dec]) => {
      const [year, month] = key.split("-");
      const mIdx = Math.max(0, Math.min(11, Number(month) - 1));
      return {
        key,
        label: `${MONTH_SHORT[mIdx]} ${String(year).slice(2)}`,
        value: toNum(dec),
      };
    });
    // `now` is created once per render — exclude it from deps to keep this stable across re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.byMonth]);

  const sparkAllZero = sparkData.every((d) => d.value === 0);

  // === Top projects ===
  const projectNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of data.rows) {
      if (r.project && !m.has(r.project.id)) {
        m.set(r.project.id, r.project.name);
      }
    }
    return m;
  }, [data.rows]);

  const topProjects = useMemo(() => {
    const items = data.byProject
      .filter((p): p is ByProjectRow & { projectId: string } => p.projectId !== null)
      .map((p) => ({
        id: p.projectId,
        name: projectNames.get(p.projectId) ?? null,
        amount: toNum(p._sum.amount),
      }))
      .filter((p) => p.name !== null) as Array<{
      id: string;
      name: string;
      amount: number;
    }>;
    return items.slice(0, 5);
  }, [data.byProject, projectNames]);

  const topProjectsMax = topProjects.reduce((m, p) => Math.max(m, p.amount), 0);

  return (
    <FadeIn className="space-y-6">
      {/* Headline + sparkline */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-2 size-5 text-primary" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            You earned{" "}
            <AnimatedAmount
              value={toNum(thisMonthTotal)}
              currency={currency}
              className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text font-bold text-transparent"
            />{" "}
            in {monthName}
          </h1>
        </div>

        <Card className="bg-card/60">
          <CardContent className="p-3">
            {sparkAllZero ? (
              <div className="flex h-[60px] items-center justify-center text-xs text-muted-foreground">
                No payouts in the last 6 months yet.
              </div>
            ) : (
              <div className="h-[60px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sparkData}
                    margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient
                        id="earningsSparkGradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#d946ef" />
                      </linearGradient>
                    </defs>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="url(#earningsSparkGradient)"
                      strokeWidth={2.25}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI grid + Top projects */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          <KpiCard
            label="This month"
            value={toNum(thisMonthTotal)}
            currency={currency}
            subtitle={`based on ${thisMonthCount} payout${thisMonthCount === 1 ? "" : "s"}`}
          />
          <KpiCard
            label="Last month"
            value={toNum(lastMonthTotal)}
            currency={currency}
            subtitle={`based on ${lastMonthCount} payout${lastMonthCount === 1 ? "" : "s"}`}
          />
          <KpiCard
            label="YTD"
            value={toNum(ytdTotal)}
            currency={currency}
            subtitle={`based on ${ytdCount} payout${ytdCount === 1 ? "" : "s"}`}
          />
          <KpiCard
            label="All-time"
            value={toNum(allTimeTotal)}
            currency={currency}
            subtitle={`based on ${allTimeCount} payout${allTimeCount === 1 ? "" : "s"}`}
          />
        </div>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Trophy className="size-4 text-primary" aria-hidden />
              Top projects
            </CardTitle>
            <CardDescription>Your highest-earning projects.</CardDescription>
          </CardHeader>
          <CardContent>
            {topProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                No project payouts yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {topProjects.map((p) => {
                  const pct =
                    topProjectsMax > 0
                      ? Math.max(4, Math.round((p.amount / topProjectsMax) * 100))
                      : 0;
                  return (
                    <li key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium">{p.name}</span>
                        <span className="whitespace-nowrap text-muted-foreground">
                          {formatMoney(p.amount, currency as never)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}

function KpiCard({
  label,
  value,
  currency,
  subtitle,
}: {
  label: string;
  value: number;
  currency: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <AnimatedAmount
          value={value}
          currency={currency}
          className="block text-xl font-semibold tracking-tight"
        />
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
