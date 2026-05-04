import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FolderKanban, IndianRupee, TrendingUp, Users, Wallet } from "lucide-react";
import { formatMoney } from "@stackzio/lib/money";
import { requireOrg } from "@/server/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getDashboardData } from "@/server/dashboard/queries";
import { listUpcomingMeetings } from "@/server/meetings/queries";
import { RevenueChart } from "./_components/revenue-chart";
import { StatusDonut, StatusLegend } from "./_components/status-donut";
import { ActivityFeed } from "./_components/activity-feed";
import { UpcomingMeetings } from "./_components/upcoming-meetings";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { org, user } = await requireOrg();
  const [data, upcoming] = await Promise.all([getDashboardData(), listUpcomingMeetings(7)]);

  const cur = data.currency as never;

  return (
    <div className="space-y-6">
      <FadeIn>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user.name?.split(" ")[0] ?? "friend"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{org.name} dashboard</h1>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<IndianRupee className="size-4" />}
          label="Revenue this month"
          value={formatMoney(data.revenueMonth, cur)}
          accent="primary"
        />
        <Stat
          icon={<Wallet className="size-4" />}
          label="Outstanding"
          value={formatMoney(data.outstanding, cur)}
          accent="warning"
        />
        <Stat
          icon={<FolderKanban className="size-4" />}
          label="Active projects"
          value={String(data.activeProjects)}
          accent="success"
        />
        <Stat
          icon={<Users className="size-4" />}
          label="Clients"
          value={String(data.clientCount)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Revenue · last 6 months
            </CardTitle>
            <CardDescription>Total payments received per month.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.monthlyRevenue} currency={data.currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Project mix</CardTitle>
            <CardDescription>Distribution by status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusDonut data={data.statusBreakdown} />
            <StatusLegend data={data.statusBreakdown} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Top outstanding</CardTitle>
              <CardDescription>Where the money is.</CardDescription>
            </div>
            <Link href="/projects" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {data.topOutstanding.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing outstanding. Treat yourself.</p>
            ) : (
              <ul className="space-y-3">
                {data.topOutstanding.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.clientName ?? "—"}</p>
                        <Progress value={p.progressPct} className="mt-2" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-warning">
                          {formatMoney(Number(p.outstanding), p.currency as never)}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">{p.progressPct}%</Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" /> Upcoming
            </CardTitle>
            <Link href="/meetings" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <UpcomingMeetings meetings={upcoming} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Everything that happened across this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed items={data.recentActivity} />
        </CardContent>
      </Card>
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
      </CardContent>
    </Card>
  );
}
