"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@stackzio/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeInviteAction } from "@/server/team/actions";

interface Props {
  invite: {
    id: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    expiresAt: Date;
    invitedBy: string;
  };
}

export function InviteRow({ invite }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function revoke() {
    start(async () => {
      const res = await revokeInviteAction(invite.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Invite revoked");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 p-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{invite.email}</p>
        <p className="truncate text-xs text-muted-foreground">
          Invited by {invite.invitedBy} · expires {formatDate(invite.expiresAt)}
        </p>
      </div>
      <Badge variant="secondary">{invite.role}</Badge>
      <Button variant="ghost" size="icon" onClick={revoke} disabled={pending} aria-label="Revoke invite">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
      </Button>
    </div>
  );
}
