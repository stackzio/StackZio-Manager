"use client";

import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@stackzio/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  title: string;
  slices: DonutSlice[];
  currency: string;
  description?: string;
}

export function BreakdownDonut({ title, slices, currency, description }: Props) {
  const cur = currency as never;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const empty = slices.length === 0 || slices.every((s) => s.value === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: 0.08 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          {empty ? (
            <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No data this period.
            </div>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
              <div className="relative h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(v: number, _name, ctx) => {
                        const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                        const label = (ctx?.payload as { name?: string } | undefined)?.name ?? "";
                        return [`${formatMoney(Number(v), cur)} · ${pct}%`, label];
                      }}
                    />
                    <Pie
                      data={slices.map((s) => ({ name: s.label, value: s.value, color: s.color }))}
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {slices.map((s) => (
                        <Cell key={s.label} fill={s.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-lg font-semibold tabular-nums">
                    {formatMoney(total, cur, { compact: total >= 100_000 })}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    total
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs">
                {slices.map((s) => {
                  const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                  return (
                    <li key={s.label} className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: s.color }}
                        aria-hidden
                      />
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="ml-auto font-medium tabular-nums">{pct}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
