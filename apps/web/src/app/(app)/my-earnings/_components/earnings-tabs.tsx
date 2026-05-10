"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Prisma } from "@stackzio/db";
import { formatDate } from "@stackzio/lib/date";
import { formatMoney } from "@stackzio/lib/money";
import { KindChip } from "@/components/finance/kind-chip";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/cn";

type PayoutKind = "SALARY" | "PROJECT" | "BONUS";
type PayoutMethod = "BANK" | "CASH" | "UPI" | "CARD" | "OTHER";

const METHOD_LABEL: Record<PayoutMethod, string> = {
  BANK: "Bank",
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

const KIND_LABEL: Record<PayoutKind, string> = {
  SALARY: "salary",
  PROJECT: "project",
  BONUS: "bonus",
};

export interface MyEarningsRow {
  id: string;
  paidAt: Date;
  kind: PayoutKind;
  amount: Prisma.Decimal;
  currency: string;
  method: PayoutMethod;
  note: string | null;
  project: { id: string; name: string } | null;
}

interface Props {
  rows: MyEarningsRow[];
  currency: string;
}

export function EarningsTabs({ rows, currency }: Props) {
  const grouped = useMemo(() => {
    const salary = rows.filter((r) => r.kind === "SALARY");
    const project = rows.filter((r) => r.kind === "PROJECT");
    const bonus = rows.filter((r) => r.kind === "BONUS");
    return { all: rows, salary, project, bonus };
  }, [rows]);

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList>
        <TabsTrigger value="all">All ({grouped.all.length})</TabsTrigger>
        <TabsTrigger value="salary">Salary ({grouped.salary.length})</TabsTrigger>
        <TabsTrigger value="project">Project ({grouped.project.length})</TabsTrigger>
        <TabsTrigger value="bonus">Bonus ({grouped.bonus.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <EarningsTable rows={grouped.all} currency={currency} emptyLabel="all" />
      </TabsContent>
      <TabsContent value="salary">
        <EarningsTable
          rows={grouped.salary}
          currency={currency}
          emptyLabel={KIND_LABEL.SALARY}
        />
      </TabsContent>
      <TabsContent value="project">
        <EarningsTable
          rows={grouped.project}
          currency={currency}
          emptyLabel={KIND_LABEL.PROJECT}
        />
      </TabsContent>
      <TabsContent value="bonus">
        <EarningsTable
          rows={grouped.bonus}
          currency={currency}
          emptyLabel={KIND_LABEL.BONUS}
        />
      </TabsContent>
    </Tabs>
  );
}

function EarningsTable({
  rows,
  currency,
  emptyLabel,
}: {
  rows: MyEarningsRow[];
  currency: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No {emptyLabel} payouts yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <Th>Date</Th>
                <Th>Kind</Th>
                <Th>Project</Th>
                <Th className="text-right">Amount</Th>
                <Th>Method</Th>
                <Th>Note</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-t transition-colors hover:bg-accent/40",
                    i % 2 === 1 && "bg-muted/10",
                  )}
                >
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(r.paidAt)}
                  </Td>
                  <Td>
                    <KindChip kind={r.kind} />
                  </Td>
                  <Td>
                    {r.project ? (
                      <Link
                        href={`/projects/${r.project.id}`}
                        className="font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        {r.project.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-right font-medium tabular-nums">
                    {formatMoney(
                      Number(r.amount.toString()),
                      currency as never,
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {METHOD_LABEL[r.method]}
                  </Td>
                  <Td className="max-w-[260px] truncate text-muted-foreground">
                    {r.note ?? "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn("px-4 py-3 text-left font-medium", className)}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
