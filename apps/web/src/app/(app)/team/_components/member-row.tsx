"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle,
  FolderKanban,
  ListChecks,
  MoreVertical,
  Shield,
  ShieldCheck,
  UserCog,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import type { OrgRole } from "@stackzio/db";
import { formatDate, timeAgo } from "@stackzio/lib/date";
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
import { cn } from "@/lib/cn";

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
  stats?: {
    projectCount: number;
    openTaskCount: number;
  };
}

const ROLE_ICON: Record<OrgRole, React.ComponentType<{ className?: string }>> = {
  OWNER: ShieldCheck,
  ADMIN: Shield,
  MEMBER: UserCog,
};

const ROLE_TONE: Record<OrgRole, string> = {
  OWNER: "border-primary/40 bg-primary/10 text-primary",
  ADMIN: "border-blue-500/30 bg-blue-500/10 text-blue-500",
  MEMBER: "border-zinc-500/30 bg-zinc-500/10 text-zinc-500",
};

export function MemberRow({ memberId, currentUserId, myRole, member, stats }: Props) {
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

  const RoleIcon = ROLE_ICON[member.role];

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
    <div className="group flex items-center gap-4 p-4 transition-colors hover:bg-accent/30">
      <Avatar className="size-11 shrink-0">
        {member.image ? <AvatarImage src={member.image} alt={member.name ?? member.email} /> : null}
        <AvatarFallback className="text-sm">{initials || "U"}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{member.name ?? member.email}</p>
          {isSelf ? (
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              you
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              ROLE_TONE[member.role],
            )}
          >
            <RoleIcon className="size-3" />
            {member.role}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{member.email}</p>
        {stats ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FolderKanban className="size-3" />
              {stats.projectCount} project{stats.projectCount === 1 ? "" : "s"}
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3" />
              {stats.openTaskCount} open task{stats.openTaskCount === 1 ? "" : "s"}
            </span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle className="size-3" />
              joined {timeAgo(member.joinedAt)}
            </span>
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">joined {formatDate(member.joinedAt)}</p>
        )}
      </div>

      {canEditRole || canRemove ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label="Member actions"
              className="opacity-60 transition-opacity group-hover:opacity-100"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canEditRole ? (
              <>
                <DropdownMenuLabel>Change role</DropdownMenuLabel>
                {myRole === "OWNER" ? (
                  <DropdownMenuItem
                    onClick={() => changeRole("OWNER")}
                    disabled={member.role === "OWNER"}
                  >
                    <ShieldCheck /> Owner
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => changeRole("ADMIN")} disabled={member.role === "ADMIN"}>
                  <Shield /> Admin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeRole("MEMBER")} disabled={member.role === "MEMBER"}>
                  <UserCog /> Member
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
            <DialogTitle>Remove {member.name ?? member.email}?</DialogTitle>
            <DialogDescription>
              They&apos;ll lose access to all projects, clients, and meetings in this organization.
              They&apos;ll keep their StackZio account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              <UserMinus className="size-4" /> Remove from org
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* keep Badge import live in case future use */}
      <Badge className="hidden">role</Badge>
    </div>
  );
}
