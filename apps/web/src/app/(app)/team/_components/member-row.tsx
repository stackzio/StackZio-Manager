"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreVertical, UserMinus } from "lucide-react";
import { toast } from "sonner";
import type { OrgRole } from "@stackzio/db";
import { formatDate } from "@stackzio/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { changeMemberRoleAction, removeMemberAction } from "@/server/team/actions";

interface Props {
  memberId: string;
  currentUserId: string;
  myRole: OrgRole;
  member: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    joinedAt: Date;
    role: OrgRole;
  };
}

export function MemberRow({ memberId, currentUserId, myRole, member }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSelf = member.id === currentUserId;
  const canEditRole =
    !isSelf && (myRole === "OWNER" || (myRole === "ADMIN" && member.role !== "OWNER"));
  const canRemove =
    !isSelf && (myRole === "OWNER" || (myRole === "ADMIN" && member.role !== "OWNER"));

  const initials = (member.name ?? member.email)
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  function changeRole(role: OrgRole) {
    start(async () => {
      const res = await changeMemberRoleAction(memberId, { role });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Role updated");
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const res = await removeMemberAction(memberId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Member removed");
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 p-3">
      <Avatar className="size-9">
        {member.image ? <AvatarImage src={member.image} alt={member.name ?? member.email} /> : null}
        <AvatarFallback className="text-xs">{initials || "U"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.name ?? member.email}
          {isSelf ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {member.email} · joined {formatDate(member.joinedAt)}
        </p>
      </div>
      <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>{member.role}</Badge>

      {canEditRole || canRemove ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={pending} aria-label="Member actions">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {canEditRole ? (
              <>
                <DropdownMenuLabel>Change role</DropdownMenuLabel>
                {myRole === "OWNER" ? (
                  <DropdownMenuItem onClick={() => changeRole("OWNER")} disabled={member.role === "OWNER"}>
                    Owner
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => changeRole("ADMIN")} disabled={member.role === "ADMIN"}>
                  Admin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeRole("MEMBER")} disabled={member.role === "MEMBER"}>
                  Member
                </DropdownMenuItem>
                {canRemove ? <DropdownMenuSeparator /> : null}
              </>
            ) : null}
            {canRemove ? (
              <DropdownMenuItem
                onClick={() => setConfirmOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <UserMinus /> Remove from org
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this member?</DialogTitle>
            <DialogDescription>
              They&apos;ll lose access to all projects, clients, and meetings in this organization. They&apos;ll keep their account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              <UserMinus className="size-4" /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
