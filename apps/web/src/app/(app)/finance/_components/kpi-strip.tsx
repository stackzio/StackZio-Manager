"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedAmount } from "@/components/finance/animated-amount";
import { cn } from "@/lib/cn";

interface CardSpec {
  label: string;
  value: number;
  prev: number;
  /** When true, "up" is good (e.g. revenue). When false, "down" is good (e.g. expenses). */
  positive?: boolean;
  /** Net profit: color tracks value sign + delta sign matches it. */
  isNet?: boolean;
  tone: string;
}

export interface KPIStripData {
  currency: string;
  revenue: number;
  expenses: number;
  payouts: number;
  net: number;
  prev: {
    revenue: number;
    expenses: number;
    payouts: number;
    net: number;
  };
}

export function KPIStrip({ data }: { data: KPIStripData }) {
  const cards: CardSpec[] = [
    {
      label: "Revenue",
      value: data.revenue,
      prev: data.prev.revenue,
      positive: true,
      tone: "from-emerald-500/15 to-emerald-500/0",
    },
    {
      label: "Expenses",
      value: data.expenses,
      prev: data.prev.expenses,
      positive: false,
      tone: "from-rose-500/15 to-rose-500/0",
    },
    {
      label: "Payouts",
      value: data.payouts,
      prev: data.prev.payouts,
      positive: false,
      tone: "from-amber-500/15 to-amber-500/0",
    },
    {
      label: "Net profit",
      value: data.net,
      prev: data.prev.net,
      isNet: true,
      tone: "from-violet-500/15 to-violet-500/0",
    },
  ];

  return (
    <motion.div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
      }}
    >
      {cards.map((c) => {
        const delta = c.value - c.prev;
        const pct = c.prev === 0 ? null : (delta / Math.abs(c.prev)) * 100;
        const TrendIcon = delta >= 0 ? TrendingUp : TrendingDown;
        const goodDirection = c.isNet
          ? delta >= 0
          : c.positive
            ? delta >= 0
            : delta <= 0;
        const valueTone = c.isNet
          ? c.value < 0
            ? "text-destructive"
            : c.value > 0
              ? "text-success"
              : ""
          : "";

        const testid = `kpi-${c.label.toLowerCase().replace(/\s+/g, "-")}`;

        return (
          <motion.div
            key={c.label}
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
            }}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            data-testid={testid}
          >
            <Card
              className={cn(
                "relative overflow-hidden bg-gradient-to-br",
                c.tone,
              )}
            >
              <div className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </p>
                <AnimatedAmount
                  value={c.value}
                  currency={data.currency}
                  className={cn(
                    "mt-1 block text-2xl font-semibold tabular-nums",
                    valueTone,
                  )}
                  data-testid={`${testid}-value`}
                />
                {pct !== null ? (
                  <p
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 text-xs",
                      goodDirection ? "text-success" : "text-destructive",
                    )}
                  >
                    <TrendIcon className="size-3" aria-hidden />
                    <span>
                      {pct >= 0 ? "+" : ""}
                      {pct.toFixed(1)}% vs prev period
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No prior period data
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
