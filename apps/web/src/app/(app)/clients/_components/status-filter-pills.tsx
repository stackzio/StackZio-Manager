"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { INTEREST_LABELS, INTEREST_ORDER } from "@/features/clients/constants";

export function StatusFilterPills() {
  const sp = useSearchParams();
  const current = sp.get("status");
  const due = sp.get("due");

  function hrefWith(patch: Record<string, string | null>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    return `/clients?${next.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Link href={hrefWith({ status: null, due: null })}>
        <Badge variant={!current && !due ? "default" : "outline"}>All</Badge>
      </Link>
      {INTEREST_ORDER.map((s) => (
        <Link key={s} href={hrefWith({ status: s, due: null })}>
          <Badge variant={current === s ? "default" : "outline"}>{INTEREST_LABELS[s]}</Badge>
        </Link>
      ))}
      <Link href={hrefWith({ due: "week", status: null })}>
        <Badge variant={due === "week" ? "warning" : "outline"}>Due this week</Badge>
      </Link>
      <Link href={hrefWith({ due: "overdue", status: null })}>
        <Badge variant={due === "overdue" ? "destructive" : "outline"}>Overdue</Badge>
      </Link>
    </div>
  );
}
