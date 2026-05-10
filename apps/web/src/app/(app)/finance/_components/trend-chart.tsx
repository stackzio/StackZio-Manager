"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { formatMoney } from "@stackzio/lib/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MonthlyPoint {
  month: string; // "YYYY-MM"
  revenue: { toFixed: (n: number) => string } | string | number;
  outflow: { toFixed: (n: number) => string } | string | number;
}

interface Props {
  monthly: MonthlyPoint[];
  currency: string;
}

const MONTH_LABELS = [
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

export function TrendChart({ monthly, currency }: Props) {
  const cur = currency as never;

  const data = useMemo(() => {
    const sorted = [...monthly].sort((a, b) => (a.month < b.month ? -1 : 1));
    return sorted.map((m) => {
      const [yearStr, monthStr] = m.month.split("-");
      const mIdx = Math.max(0, Math.min(11, Number(monthStr) - 1));
      const label = `${MONTH_LABELS[mIdx]} ${String(yearStr).slice(2)}`;
      return {
        key: m.month,
        label,
        revenue: toDisplayNumber(m.revenue),
        outflow: toDisplayNumber(m.outflow),
      };
    });
  }, [monthly]);

  const allZero = data.every((d) => d.revenue === 0 && d.outflow === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" aria-hidden />
            Revenue vs outflow · last 12 months
          </CardTitle>
          <CardDescription>
            Money in (payments) versus money out (expenses + payouts).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allZero ? (
            <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No activity in the last 12 months yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#d946ef" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={64}
                    tickFormatter={(v) => formatMoney(Number(v), cur, { compact: true })}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(v: number, name) => [
                      formatMoney(Number(v), cur),
                      name === "revenue" ? "Revenue" : "Outflow",
                    ]}
                    labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value) => (value === "revenue" ? "Revenue" : "Outflow")}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke="url(#revenueLineGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#7c3aed", stroke: "#fff", strokeWidth: 1 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="outflow"
                    name="outflow"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 2.5, fill: "hsl(var(--muted-foreground))" }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function toDisplayNumber(v: MonthlyPoint["revenue"]): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  // Prisma.Decimal — render boundary only.
  return Number(v.toFixed(2));
}
