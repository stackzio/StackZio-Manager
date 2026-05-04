import type { Metadata } from "next";
import { CalendarClock, FolderKanban, IndianRupee, Users, Wallet } from "lucide-react";
import { prisma } from "@stackzio/db";
import { formatMoney } from "@stackzio/lib/money";
import { requireOrg } from "@/server/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { org, user } = await requireOrg();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [activeProjects, clientCount, paymentsThisMonth, outstandingAgg] = await Promise.all([
    prisma.project.count({
      where: { organizationId: org.id, status: { in: ["LEAD", "IN_PROGRESS", "ON_HOLD"] } },
    }),
    prisma.client.count({ where: { organizationId: org.id } }),
    prisma.payment.aggregate({
      where: { organizationId: org.id, paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<{ outstanding: number }[]>`
      SELECT COALESCE(SUM(p."priceTotal" - COALESCE(paid.total, 0)), 0)::float AS outstanding
      FROM "Project" p
      LEFT JOIN (
        SELECT "projectId", SUM(amount) AS total
        FROM "Payment"
        GROUP BY "projectId"
      ) paid ON paid."projectId" = p.id
      WHERE p."organizationId" = ${org.id}
        AND p.status NOT IN ('COMPLETED', 'CANCELLED')
    `,
  ]);

  const revenueMonth = Number(paymentsThisMonth._sum.amount ?? 0);
  const outstanding = outstandingAgg[0]?.outstanding ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.name?.split(" ")[0] ?? "friend"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{org.name} dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<IndianRupee className="size-4" />}
          label="Revenue this month"
          value={formatMoney(revenueMonth, org.defaultCurrency as never)}
          accent="primary"
        />
        <Stat
          icon={<Wallet className="size-4" />}
          label="Outstanding"
          value={formatMoney(outstanding, org.defaultCurrency as never)}
          accent="warning"
        />
        <Stat
          icon={<FolderKanban className="size-4" />}
          label="Active projects"
          value={String(activeProjects)}
          accent="success"
        />
        <Stat
          icon={<Users className="size-4" />}
          label="Clients"
          value={String(clientCount)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Charts and trends arrive in Phase 3 — data is live now.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Charts coming next.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" /> Upcoming meetings
            </CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              No meetings yet.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "primary" | "warning" | "success";
}) {
  const tone =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "warning"
        ? "bg-warning/10 text-warning"
        : accent === "success"
          ? "bg-success/10 text-success"
          : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-lg p-2 ${tone}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-xl font-semibold tabular-nums">{value}</p>
        </div>
        {accent ? (
          <Badge variant={accent === "warning" ? "warning" : accent === "success" ? "success" : "default"} className="ml-auto">
            live
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}
