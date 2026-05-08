import Link from "next/link";
import { ArrowUpRight, CalendarDays, IndianRupee, User2, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, timeAgo } from "@stackzio/lib/date";
import { formatMoney } from "@stackzio/lib/money";
import { CategoryBadge, StatusBadge } from "./status-badge";

interface Member {
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface OverviewProject {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  priceTotal: unknown;
  currency: string;
  startDate: Date | null;
  deadline: Date | null;
  progressPct: number;
  paid: number;
  outstanding: number;
  client: { id: string; name: string; company: string | null } | null;
  owner: { id: string; name: string | null; email: string; image: string | null } | null;
  members: Member[];
  updatedAt: Date;
}

export function ProjectOverview({
  project,
  showFinancials,
  showClient,
}: {
  project: OverviewProject;
  /** Show price/paid/outstanding cards. Hidden for MEMBER role. */
  showFinancials: boolean;
  /** Show the client info card. Hidden for MEMBER role. */
  showClient: boolean;
}) {
  const cur = project.currency as never;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <CategoryBadge category={project.category} />
            <span className="text-xs text-muted-foreground">Updated {timeAgo(project.updatedAt)}</span>
          </div>

          {project.description ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-wider text-muted-foreground">Progress</span>
              <span className="font-semibold tabular-nums">{project.progressPct}%</span>
            </div>
            <Progress value={project.progressPct} />
          </div>

          {showFinancials ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                icon={<IndianRupee className="size-4" />}
                label="Price total"
                value={formatMoney(Number(project.priceTotal), cur)}
              />
              <Stat
                icon={<Wallet className="size-4" />}
                label="Paid"
                value={formatMoney(project.paid, cur)}
                accent="success"
              />
              <Stat
                icon={<Wallet className="size-4" />}
                label="Outstanding"
                value={formatMoney(project.outstanding, cur)}
                accent={project.outstanding > 0 ? "warning" : "success"}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {showClient ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.client ? (
                <Link
                  href={`/clients/${project.client.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/30"
                >
                  <Avatar className="size-9 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">
                      {project.client.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{project.client.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.client.company ?? "—"}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No client linked.</p>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.owner ? <PersonRow user={project.owner} /> : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row icon={<CalendarDays className="size-4" />} label="Start" value={formatDate(project.startDate)} />
            <Row icon={<CalendarDays className="size-4" />} label="Deadline" value={formatDate(project.deadline)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PersonRow({ user }: { user: { name: string | null; email: string; image: string | null } }) {
  const initials = (user.name ?? user.email)
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-9">
        {user.image ? <AvatarImage src={user.image} alt={user.name ?? user.email} /> : null}
        <AvatarFallback className="text-xs">{initials || "U"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon} {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
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
  accent?: "success" | "warning";
}) {
  const tone =
    accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className={`mt-1 text-base font-semibold tabular-nums ${tone}`}>{value}</p>
      {/* user2 icon import sentinel */}
      <User2 className="hidden" />
    </div>
  );
}
