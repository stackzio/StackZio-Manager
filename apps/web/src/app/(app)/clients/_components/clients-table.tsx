"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock } from "lucide-react";
import type { ClientInterest } from "@stackzio/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { InterestBadge } from "@/features/clients/components/interest-badge";
import { formatDate, timeAgo } from "@stackzio/lib/date";

export interface ClientRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  interestStatus: ClientInterest;
  followUpAt: Date | string | null;
  _count: { projects: number; contacts: number };
}

const COLUMNS: ColumnDef<ClientRow>[] = [
  {
    id: "name",
    header: "Client",
    accessorKey: "name",
    meta: { sortable: true },
    cell: ({ row }) => {
      const c = row.original;
      const initials = c.name.slice(0, 2).toUpperCase();
      return (
        <Link href={`/clients/${c.id}`} className="flex items-center gap-3 hover:text-primary">
          <Avatar className="size-9 rounded-lg">
            <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{c.name}</p>
            <p className="truncate text-xs text-muted-foreground">{c.company ?? "—"}</p>
          </div>
        </Link>
      );
    },
  },
  {
    id: "email",
    header: "Email",
    accessorKey: "email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
    ),
  },
  {
    id: "phone",
    header: "Phone",
    accessorKey: "phone",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.phone ?? "—"}</span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <InterestBadge status={row.original.interestStatus} />,
  },
  {
    id: "followUpAt",
    header: "Follow-up",
    meta: { sortable: true },
    cell: ({ row }) => {
      const v = row.original.followUpAt;
      if (!v) return <span className="text-muted-foreground">—</span>;
      const d = new Date(v);
      const overdue = d.getTime() < Date.now();
      return (
        <span
          className={
            overdue
              ? "inline-flex items-center gap-1 text-destructive"
              : "inline-flex items-center gap-1 text-muted-foreground"
          }
        >
          <CalendarClock className="size-3" />
          {formatDate(d, "dd MMM")} · {overdue ? `${timeAgo(d)} late` : timeAgo(d)}
        </span>
      );
    },
  },
  {
    id: "location",
    header: "Location",
    cell: ({ row }) => {
      const c = row.original;
      const loc = [c.city, c.country].filter(Boolean).join(", ");
      return <span className="text-muted-foreground">{loc || "—"}</span>;
    },
  },
  {
    id: "counts",
    header: "Projects",
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original._count.projects}</Badge>
    ),
  },
];

export function ClientsTable({
  rows,
  sort,
  dir,
  emptyState,
}: {
  rows: ClientRow[];
  sort?: string;
  dir?: "asc" | "desc";
  emptyState?: React.ReactNode;
}) {
  return (
    <DataTable
      columns={COLUMNS}
      data={rows}
      sortBy={sort}
      sortDir={dir}
      rowHref={(r) => `/clients/${r.id}`}
      emptyState={emptyState}
    />
  );
}
