"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@stackzio/lib/money";

interface Props {
  data: Array<{ key: string; label: string; total: number }>;
  currency: string;
}

export function RevenueChart({ data, currency }: Props) {
  const cur = currency as never;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
              <stop offset="60%" stopColor="#d946ef" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
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
            width={60}
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
            formatter={(v: number) => [formatMoney(Number(v), cur), "Paid"]}
            labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#7c3aed"
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            dot={{ r: 3, fill: "#7c3aed", stroke: "#fff", strokeWidth: 1 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
