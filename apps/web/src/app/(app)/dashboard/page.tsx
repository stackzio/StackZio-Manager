import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertOctagon,
  CalendarClock,
  CheckSquare,
  FolderKanban,
  IndianRupee,
  ListChecks,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { formatMoney } from "@stackzio/lib/money";
import { formatDate } from "@stackzio/lib/date";
import { canSeeProjectFinancials, requireOrg } from "@/server/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/loading-skeleton";
import { getDashboardData, getMemberDashboardData } from "@/server/dashboard/queries";
import { listUpcomingMeetings } from "@/server/meetings/queries";
import { ActivityFeed } from "./_components/activity-feed";
import { UpcomingMeetings } from "./_components/upcoming-meetings";
import { FadeIn } from "@/components/motion/fade-in";

const RevenueChart = dynamic(
  () => import("./_components/revenue-chart").then((m) => m.RevenueChart),
  { loading: () => <Skeleton className="h-56 w-full rounded-lg" /> },
);
const StatusDonut = dynamic(
  () => import("./_components/status-donut").then((m) => m.StatusDonut),
  { loading: () => <Skeleton className="h-48 w-full rounded-lg" /> },
);
const StatusLegend = dynamic(
  () => import("./_components/status-donut").then((m) => m.StatusLegend),
  { loading: () => <Skeleton className="h-20 w-full rounded-lg" /> },
);

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { org, role, user } = await requireOrg();
  const firstName = user.name?.split(" ")[0] ?? "friend";
  if (canSeeProjectFinancials(role)) {
    return <AdminDashboard orgName={org.name} firstName={firstName} />;
  }
  return <MemberDashboard orgName={org.name} firstName={firstName} />;
}

// ----------- Admin / Owner ------------------------------------------------

async function AdminDashboard({ orgName, firstName }: { orgName: string; firstName: string }) {
  const [data, upcoming] = await Promise.all([getDashboardData(), listUpcomingMeetings(7)]);
  const cur = data.currency as never;

  return (
    <div className="space-y-6">
      <FadeIn>
        <p className="text-sm text-muted-foreground">Welcome back, {firstName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{orgName} dashboard</h1>
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
        <Stat icon={<Users className="size-4" />} label="Clients" value={String(data.clientCount)} />
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
                        <Badge variant="secondary" className="text-[10px]">
                          {p.progressPct}%
                        </Badge>
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

// ----------- Member -------------------------------------------------------

async function MemberDashboard({ orgName, firstName }: { orgName: string; firstName: string }) {
  const [data, upcoming] = await Promise.all([getMemberDashboardData(), listUpcomingMeetings(7)]);

  return (
    <div className="space-y-6">
      <FadeIn>
        <p className="text-sm text-muted-foreground">Welcome back, {firstName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Your work in {orgName}</h1>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<FolderKanban className="size-4" />}
          label="Active projects"
          value={String(data.myActiveProjects)}
          accent="primary"
          sub={`${data.myProjectsCount} total assigned`}
        />
        <Stat
          icon={<ListChecks className="size-4" />}
          label="My open tasks"
          value={String(data.myOpenTasksCount)}
          accent="success"
        />
        <Stat
          icon={<AlertOctagon className="size-4" />}
          label="Overdue"
          value={String(data.myOverdueTasksCount)}
          accent={data.myOverdueTasksCount > 0 ? "warning" : "success"}
        />
        <Stat
          icon={<CalendarClock className="size-4" />}
          label="Due in 7 days"
          value={String(data.myDueSoonTasksCount)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="size-4 text-primary" /> My next tasks
              </CardTitle>
              <CardDescription>Sorted by due date — nearest first.</CardDescription>
            </div>
            <Link
              href="/my-tasks"
              className="rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow hover:brightness-110"
            >
              Open task board →
            </Link>
          </CardHeader>
          <CardContent>
            {data.myTasksList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing assigned to you right now. Take a breath.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.myTasksList.map((t) => {
                  const overdue =
                    t.dueDate && t.status !== "DONE" && new Date(t.dueDate) < new Date();
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/projects/${t.project.id}?tab=tasks`}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{t.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.project.name} · {t.status}
                          </p>
                        </div>
                        {t.dueDate ? (
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-[11px] " +
                              (overdue
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground")
                            }
                          >
                            {overdue ? "Overdue · " : "Due "}
                            {formatDate(t.dueDate)}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My project mix</CardTitle>
            <CardDescription>Status of projects you&apos;re on.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusDonut data={data.statusBreakdown} />
            <StatusLegend data={data.statusBreakdown} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" /> Upcoming meetings
            </CardTitle>
            <Link href="/meetings" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <UpcomingMeetings meetings={upcoming} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Updates from your projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={data.recentActivity} />
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
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "primary" | "warning" | "success";
  sub?: string;
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
          {sub ? <p className="truncate text-[10px] text-muted-foreground">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
