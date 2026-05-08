import type { Metadata } from "next";
import { AlertOctagon, CalendarClock, CheckCircle2, ListChecks } from "lucide-react";
import { requireOrg } from "@/server/auth/guards";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getMyTasks } from "@/server/projects/my-tasks-queries";
import { MyTasksBoard } from "./_components/my-tasks-board";

export const metadata: Metadata = { title: "My tasks" };

export default async function MyTasksPage() {
  const { user } = await requireOrg();
  const data = await getMyTasks();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My tasks"
        description={`${data.counts.total} task${data.counts.total === 1 ? "" : "s"} assigned to you across all your projects.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          tone={data.counts.overdue > 0 ? "danger" : "neutral"}
          icon={<AlertOctagon className="size-4" />}
          label="Overdue"
          value={data.counts.overdue}
        />
        <KpiCard
          tone={data.counts.dueToday > 0 ? "warning" : "neutral"}
          icon={<CalendarClock className="size-4" />}
          label="Due today"
          value={data.counts.dueToday}
        />
        <KpiCard
          tone="primary"
          icon={<CalendarClock className="size-4" />}
          label="Due in 7 days"
          value={data.counts.dueThisWeek}
        />
        <KpiCard
          tone="success"
          icon={<CheckCircle2 className="size-4" />}
          label="Completed"
          value={data.counts.done}
          sub="ever"
        />
      </div>

      {data.counts.total === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="rounded-full bg-brand-gradient p-3 text-white shadow-lg">
              <ListChecks className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">All clear, {user.name?.split(" ")[0] ?? "friend"}</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                You have no open tasks right now. As tasks get assigned to you, they&apos;ll show up
                here organised by status. Take a breath.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <MyTasksBoard
          todo={data.byStatus.TODO}
          doing={data.byStatus.DOING}
          done={data.byStatus.DONE}
        />
      )}
    </div>
  );
}

function KpiCard({
  tone,
  icon,
  label,
  value,
  sub,
}: {
  tone: "primary" | "success" | "warning" | "danger" | "neutral";
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
}) {
  const colour =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "warning"
          ? "bg-warning/10 text-warning"
          : tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`rounded-lg p-2 ${colour}`}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {sub ? <p className="truncate text-[10px] text-muted-foreground">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
