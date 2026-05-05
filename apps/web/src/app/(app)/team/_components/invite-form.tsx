"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Loader2, Mail, MailWarning, Send } from "lucide-react";
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

interface LastInvite {
  link: string;
  emailSent: boolean;
  emailError?: string;
}

export function InviteForm({ canInviteOwner }: { canInviteOwner: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [role, setRole] = useState<OrgRole>("MEMBER");
  const [last, setLast] = useState<LastInvite | null>(null);

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
      setLast({ link: res.link, emailSent: res.emailSent, emailError: res.emailError });
      if (res.emailSent) {
        toast.success("Invite email sent");
      } else {
        toast.message("Invite created — share the link below", {
          description: res.emailError ?? "Email could not be sent.",
        });
      }
      form.reset();
      setRole("MEMBER");
      router.refresh();
    });
  }

  function copy() {
    if (!last) return;
    navigator.clipboard.writeText(last.link);
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
      {last ? (
        <div
          className={
            "space-y-2 rounded-lg border p-3 " +
            (last.emailSent
              ? "border-success/30 bg-success/5"
              : "border-warning/40 bg-warning/5")
          }
        >
          <div className="flex items-start gap-2 text-xs">
            {last.emailSent ? (
              <>
                <Mail className="mt-0.5 size-3.5 shrink-0 text-success" />
                <div>
                  <p className="font-medium text-foreground">Email sent</p>
                  <p className="text-muted-foreground">
                    They can also use this link directly:
                  </p>
                </div>
              </>
            ) : (
              <>
                <MailWarning className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <div>
                  <p className="font-medium text-foreground">
                    Couldn&apos;t send the email — share this link manually
                  </p>
                  {last.emailError ? (
                    <p className="text-[11px] text-muted-foreground">
                      {prettyEmailError(last.emailError)}
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input readOnly value={last.link} className="text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy invite link">
              <Copy className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function prettyEmailError(raw: string): string {
  // Resend's free-tier sandbox restricts recipients — surface the explanation.
  if (raw.includes("550") && raw.includes("verify a domain")) {
    return "Resend sandbox can only deliver to your verified email. Verify a domain at resend.com/domains to enable sending to anyone, or just share the link.";
  }
  if (raw.length > 220) return raw.slice(0, 220) + "…";
  return raw;
}
