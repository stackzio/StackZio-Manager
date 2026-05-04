"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import type { OrgRole } from "@stackzio/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteMemberAction } from "@/server/team/actions";

export function InviteForm({ canInviteOwner }: { canInviteOwner: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [role, setRole] = useState<OrgRole>("MEMBER");
  const [lastLink, setLastLink] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim();
    start(async () => {
      const res = await inviteMemberAction({ email, role });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Invite sent");
      setLastLink(res.link);
      form.reset();
      setRole("MEMBER");
      router.refresh();
    });
  }

  function copy() {
    if (!lastLink) return;
    navigator.clipboard.writeText(lastLink);
    toast.success("Link copied");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="teammate@example.com" />
      </div>
      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MEMBER">Member</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            {canInviteOwner ? <SelectItem value="OWNER">Owner</SelectItem> : null}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? "Sending…" : "Send invite"}
      </Button>
      {lastLink ? (
        <div className="space-y-1 rounded-lg border bg-muted/30 p-2">
          <p className="text-xs text-muted-foreground">If email isn&apos;t set up yet, share this link manually:</p>
          <div className="flex items-center gap-2">
            <Input readOnly value={lastLink} className="text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy">
              <Copy className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
