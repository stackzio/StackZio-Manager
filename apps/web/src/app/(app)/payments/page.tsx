import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { listPayments } from "@/server/payments/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "../clients/_components/pagination";
import { formatDate } from "@stackzio/lib/date";
import { formatMoney } from "@stackzio/lib/money";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = typeof sp.page === "string" ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;
  const result = await listPayments({ page });

  const total = result.items.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" description="Every advance, milestone and final across your projects." />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-4 text-primary" /> Recent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.items.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="size-5" />}
              title="No payments recorded yet"
              description="Open a project and record an advance, milestone or final payment."
            />
          ) : (
            <>
              <ul className="divide-y rounded-lg border">
                {result.items.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/projects/${p.project.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {p.project.name}
                        </Link>
                        <Badge variant="secondary">{p.kind}</Badge>
                        <Badge variant="outline">{p.method}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {p.project.client?.name ?? ""} · {formatDate(p.paidAt)}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums">
                      {formatMoney(Number(p.amount), p.project.currency as never)}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Page total: <span className="font-medium">{total.toFixed(2)}</span> across {result.items.length} entries
              </p>
            </>
          )}
        </CardContent>
      </Card>
      <Pagination total={result.total} page={result.page} pageSize={result.pageSize} />
    </div>
  );
}
