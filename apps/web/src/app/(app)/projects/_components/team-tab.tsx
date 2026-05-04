"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberMultiselect, type MemberOption } from "./member-multiselect";
import { updateProjectAction } from "@/server/projects/actions";
import type { UpsertProjectInput } from "@/server/projects/schemas";

interface Props {
  projectId: string;
  currentValues: UpsertProjectInput;
  members: MemberOption[];
  owner: { id: string; name: string | null; email: string; image: string | null } | null;
  isAdmin: boolean;
}

export function TeamTab({ projectId, currentValues, members, owner, isAdmin }: Props) {
  const [pending, start] = useTransition();
  const [memberIds, setMemberIds] = useState<string[]>(currentValues.memberIds ?? []);

  function save() {
    start(async () => {
      const res = await updateProjectAction(projectId, { ...currentValues, memberIds });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Team updated");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          {isAdmin
            ? "Choose who's on this project. Members see only the projects they're assigned to."
            : "These are the people working on this project."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {owner ? (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Owner</p>
            <PersonRow user={owner} role="OWNER" />
          </div>
        ) : null}

        {isAdmin ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Members</p>
            <MemberMultiselect options={members} value={memberIds} onChange={setMemberIds} />
            <div className="flex justify-end">
              <Button onClick={save} disabled={pending} variant="gradient">
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {pending ? "Saving…" : "Save team"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Members</p>
            {memberIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <ul className="space-y-2">
                {members
                  .filter((m) => memberIds.includes(m.id))
                  .map((m) => (
                    <PersonRow key={m.id} user={m} />
                  ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PersonRow({
  user,
  role,
}: {
  user: { name: string | null; email: string; image: string | null };
  role?: string;
}) {
  const initials = (user.name ?? user.email)
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar className="size-9">
        {user.image ? <AvatarImage src={user.image} alt={user.name ?? user.email} /> : null}
        <AvatarFallback className="text-xs">{initials || "U"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      {role ? <Badge>{role}</Badge> : null}
    </div>
  );
}
