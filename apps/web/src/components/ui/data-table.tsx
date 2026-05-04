"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/cn";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyState?: React.ReactNode;
  rowHref?: (row: TData) => string;
  /** Optional column id used for sort param in the URL (sort=col, dir=asc|desc). */
  sortBy?: string;
  /** Current sort direction reflected from URL. */
  sortDir?: "asc" | "desc";
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyState,
  rowHref,
  sortBy,
  sortDir,
  className,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function setSort(col: string) {
    const next = new URLSearchParams(params.toString());
    if (sortBy !== col) {
      next.set("sort", col);
      next.set("dir", "asc");
    } else if (sortDir === "asc") {
      next.set("sort", col);
      next.set("dir", "desc");
    } else {
      next.delete("sort");
      next.delete("dir");
    }
    start(() => router.push("?" + next.toString()));
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)} data-pending={pending}>
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const sortable = (h.column.columnDef.meta as { sortable?: boolean } | undefined)?.sortable;
                const id = h.column.id;
                const isSorted = sortBy === id;
                return (
                  <th key={h.id} className="whitespace-nowrap px-4 py-3 text-left">
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => setSort(id)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {isSorted ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {emptyState ?? (
                  <div className="p-12 text-center text-sm text-muted-foreground">No results.</div>
                )}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-t transition-colors hover:bg-accent/40",
                  rowHref ? "cursor-pointer" : "",
                )}
                onClick={
                  rowHref
                    ? () => start(() => router.push(rowHref(row.original)))
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
