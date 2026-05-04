"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/server/team/actions";
import { switchOrganizationAction } from "@/server/organization/actions";

export function AcceptInviteButton({ token, disabled }: { token: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function accept() {
    start(async () => {
      const res = await acceptInviteAction(token);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Switch to the newly-joined org so the dashboard shows it.
      await switchOrganizationAction({ organizationId: res.organizationId });
      toast.success("You're in");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Button onClick={accept} variant="gradient" className="w-full" disabled={pending || disabled}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
      {pending ? "Joining…" : "Accept invite"}
    </Button>
  );
}
