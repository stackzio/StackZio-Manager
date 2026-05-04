import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, Shield, ShieldCheck, UserCog, UserPlus } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Invite teammates, manage roles, and decide who sees what."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="size-4 text-primary" /> Members ({members.length})
              </CardTitle>
              <CardDescription>People who have access to this organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-lg border">
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
                      }}
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
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-lg border">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-4 text-primary" /> Invite a teammate
              </CardTitle>
              <CardDescription>They&apos;ll get a link to join your org.</CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm canInviteOwner={role === "OWNER"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Roles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <RoleHelp icon={<ShieldCheck className="size-4" />} role="OWNER" desc="Full control. Can transfer ownership. There must always be at least one." />
              <RoleHelp icon={<Shield className="size-4" />} role="ADMIN" desc="Can manage clients, projects, payments, team — except editing OWNER roles." />
              <RoleHelp icon={<UserCog className="size-4" />} role="MEMBER" desc="Sees only assigned projects. Cannot edit price, payments, or team." />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RoleHelp({ icon, role, desc }: { icon: React.ReactNode; role: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <Badge variant={role === "OWNER" ? "default" : "secondary"}>{role}</Badge>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
