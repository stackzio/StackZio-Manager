"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  total: number;
  page: number;
  pageSize: number;
}

export function Pagination({ total, page, pageSize }: Props) {
  const params = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function href(p: number) {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(p));
    return "?" + sp.toString();
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <p>
        Showing {start}–{end} of {total}
      </p>
      <div className="flex gap-1">
        <Button asChild variant="outline" size="icon" disabled={page <= 1}>
          <Link href={href(Math.max(1, page - 1))} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="icon" disabled={page >= totalPages}>
          <Link href={href(Math.min(totalPages, page + 1))} aria-label="Next page">
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
