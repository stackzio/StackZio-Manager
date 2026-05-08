"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Hash } from "lucide-react";
import { formatMoney } from "@stackzio/lib/money";
import { formatDate } from "@stackzio/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Progress } from "@/components/ui/progress";
import { CategoryBadge, StatusBadge } from "./status-badge";

export interface ProjectRow {
  id: string;
  name: string;
  category: string;
  status: string;
  priceTotal: unknown;
  currency: string;
  progressPct: number;
  deadline: Date | null;
  paid: number;
  outstanding: number;
  client: { id: string; name: string; company: string | null } | null;
  owner: { id: string; name: string | null; email: string; image: string | null } | null;
  _count: { tasks: number; members: number };
}

const NAME_COL: ColumnDef<ProjectRow> = {
  id: "name",
  header: "Project",
  accessorKey: "name",
  meta: { sortable: true },
  cell: ({ row }) => {
    const p = row.original;
    return (
      <Link href={`/projects/${p.id}`} className="block hover:text-primary">
        <p className="truncate font-medium">{p.name}</p>
        <p className="truncate text-xs text-muted-foreground">{p.client?.name ?? "—"}</p>
      </Link>
    );
  },
};

const STATUS_COL: ColumnDef<ProjectRow> = {
  id: "status",
  header: "Status",
  cell: ({ row }) => (
    <div className="flex flex-wrap items-center gap-1">
      <StatusBadge status={row.original.status} />
      <CategoryBadge category={row.original.category} />
    </div>
  ),
};

const OWNER_COL: ColumnDef<ProjectRow> = {
  id: "owner",
  header: "Owner",
  cell: ({ row }) => {
    const o = row.original.owner;
    if (!o) return <span className="text-muted-foreground">—</span>;
    const initials = (o.name ?? o.email)
      .split(/[\s.@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
    return (
      <div className="flex items-center gap-2">
        <Avatar className="size-6">
          {o.image ? <AvatarImage src={o.image} alt={o.name ?? o.email} /> : null}
          <AvatarFallback className="text-[10px]">{initials || "U"}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm">{o.name ?? o.email}</span>
      </div>
    );
  },
};

const PROGRESS_COL: ColumnDef<ProjectRow> = {
  id: "progress",
  header: "Progress",
  cell: ({ row }) => {
    const p = row.original;
    return (
      <div className="w-32 space-y-1">
        <Progress value={p.progressPct} />
        <p className="text-[11px] text-muted-foreground">{p.progressPct}%</p>
      </div>
    );
  },
};

const MONEY_COL: ColumnDef<ProjectRow> = {
  id: "money",
  header: "Outstanding",
  accessorKey: "outstanding",
  meta: { sortable: false },
  cell: ({ row }) => {
    const p = row.original;
    const cur = p.currency as never;
    return (
      <div className="text-right text-sm tabular-nums">
        <p className="font-semibold">{formatMoney(p.outstanding, cur)}</p>
        <p className="text-xs text-muted-foreground">of {formatMoney(Number(p.priceTotal), cur)}</p>
      </div>
    );
  },
};

const TASKS_COL: ColumnDef<ProjectRow> = {
  id: "tasks",
  header: "Tasks",
  cell: ({ row }) => (
    <Badge variant="secondary" className="gap-1 text-[11px]">
      <Hash className="size-3" /> {row.original._count.tasks}
    </Badge>
  ),
};

const DEADLINE_COL: ColumnDef<ProjectRow> = {
  id: "deadline",
  header: "Deadline",
  accessorKey: "deadline",
  meta: { sortable: true },
  cell: ({ row }) => (
    <span className="text-sm text-muted-foreground">
      {row.original.deadline ? formatDate(row.original.deadline) : "—"}
    </span>
  ),
};

export function ProjectsTable({
  rows,
  sort,
  dir,
  emptyState,
  showFinancials,
}: {
  rows: ProjectRow[];
  sort?: string;
  dir?: "asc" | "desc";
  emptyState?: React.ReactNode;
  /** Show price/outstanding columns. Hidden for MEMBER role. */
  showFinancials: boolean;
}) {
  const columns = useMemo<ColumnDef<ProjectRow>[]>(
    () =>
      showFinancials
        ? [NAME_COL, STATUS_COL, OWNER_COL, PROGRESS_COL, MONEY_COL, DEADLINE_COL]
        : [NAME_COL, STATUS_COL, OWNER_COL, PROGRESS_COL, TASKS_COL, DEADLINE_COL],
    [showFinancials],
  );
  return (
    <DataTable
      columns={columns}
      data={rows}
      sortBy={sort}
      sortDir={dir}
      rowHref={(r) => `/projects/${r.id}`}
      emptyState={emptyState}
    />
  );
}
