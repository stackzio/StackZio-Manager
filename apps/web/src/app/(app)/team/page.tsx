import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Mail,
  Shield,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { listTeam } from "@/server/team/queries";
import { requireOrg } from "@/server/auth/guards";
import { InviteForm } from "./_components/invite-form";
import { MemberRow } from "./_components/member-row";
import { InviteRow } from "./_components/invite-row";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const { role, user } = await requireOrg();
  if (role !== "OWNER" && role !== "ADMIN") redirect("/dashboard");

  const { members, invites } = await listTeam();

  const ownerCount = members.filter((m) => m.role === "OWNER").length;
  const adminCount = members.filter((m) => m.role === "ADMIN").length;
  const memberCount = members.filter((m) => m.role === "MEMBER").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Invite teammates, manage roles, and decide who sees what."
      />

      {/* Stats strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<UsersIcon className="size-4" />}
          label="Total members"
          value={String(members.length)}
          tone="primary"
        />
        <StatCard
          icon={<ShieldCheck className="size-4" />}
          label="Owners"
          value={String(ownerCount)}
        />
        <StatCard icon={<Shield className="size-4" />} label="Admins" value={String(adminCount)} />
        <StatCard
          icon={<UserCog className="size-4" />}
          label="Members"
          value={String(memberCount)}
          sub={
            invites.length > 0
              ? `${invites.length} pending invite${invites.length === 1 ? "" : "s"}`
              : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="size-4 text-primary" /> Members ({members.length})
              </CardTitle>
              <CardDescription>
                Hover any row for actions — change role, remove from org.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y border-y">
                {members.map((m) => (
                  <li key={m.id}>
                    <MemberRow
                      memberId={m.id}
                      currentUserId={user.id}
                      myRole={role}
                      member={{
                        id: m.user.id,
                        name: m.user.name,
                        email: m.user.email,
                        image: m.user.image,
                        joinedAt: m.joinedAt,
                        role: m.role,
                        canSeeFinancials: m.canSeeFinancials,
                      }}
                      stats={m.stats}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {invites.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-4 text-primary" /> Pending invites ({invites.length})
                </CardTitle>
                <CardDescription>
                  Hasn&apos;t accepted yet — links expire after 7 days. You can revoke any invite.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y border-y">
                  {invites.map((i) => (
                    <li key={i.id}>
                      <InviteRow
                        invite={{
                          id: i.id,
                          email: i.email,
                          role: i.role,
                          expiresAt: i.expiresAt,
                          invitedBy: i.invitedBy.name ?? i.invitedBy.email,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-brand-gradient p-4 text-white">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <UserPlus className="size-4" /> Invite a teammate
              </p>
              <p className="mt-1 text-xs text-white/85">
                They&apos;ll get a one-click link to join your org.
              </p>
            </div>
            <CardContent className="pt-4">
              <InviteForm canInviteOwner={role === "OWNER"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What each role can do</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <RoleHelp
                icon={<ShieldCheck className="size-4 text-primary" />}
                role="OWNER"
                desc="Full control. Can transfer ownership and delete the organization. There must always be at least one."
              />
              <RoleHelp
                icon={<Shield className="size-4 text-blue-500" />}
                role="ADMIN"
                desc="Manages clients, projects, payments, team — except editing OWNER roles."
              />
              <RoleHelp
                icon={<UserCog className="size-4 text-zinc-500" />}
                role="MEMBER"
                desc="Sees only assigned projects. No revenue, payments, or pricing visible. Docs are view-only."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "primary";
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={
            "rounded-lg p-2 " +
            (tone === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
          }
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          {sub ? <p className="truncate text-[10px] text-muted-foreground">{sub}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function RoleHelp({
  icon,
  role,
  desc,
}: {
  icon: React.ReactNode;
  role: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0">
        <Badge variant={role === "OWNER" ? "default" : "secondary"}>{role}</Badge>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
