"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  data: Array<{ status: string; count: number }>;
}

const LABEL: Record<string, string> = {
  LEAD: "Lead",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const COLOR: Record<string, string> = {
  LEAD: "#a78bfa",
  IN_PROGRESS: "#7c3aed",
  ON_HOLD: "#f59e0b",
  COMPLETED: "#22c55e",
  CANCELLED: "#ef4444",
};

export function StatusDonut({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const decorated = data.map((d) => ({
    name: LABEL[d.status] ?? d.status,
    value: d.count,
    fill: COLOR[d.status] ?? "#94a3b8",
    status: d.status,
  }));

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No projects yet.
      </div>
    );
  }

  return (
    <div className="relative h-48 w-full">
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
              return [`${v} · ${pct}%`, ctx?.payload?.name];
            }}
          />
          <Pie
            data={decorated}
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="hsl(var(--card))"
            strokeWidth={2}
          >
            {decorated.map((d) => (
              <Cell key={d.status} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-2xl font-semibold tabular-nums">{total}</p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">projects</p>
      </div>
    </div>
  );
}

export function StatusLegend({ data }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-2 text-xs">
      {data.map((d) => (
        <li key={d.status} className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: COLOR[d.status] ?? "#94a3b8" }} />
          <span className="text-muted-foreground">{LABEL[d.status] ?? d.status}</span>
          <span className="ml-auto font-medium tabular-nums">{d.count}</span>
        </li>
      ))}
    </ul>
  );
}
