"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/server/user/actions";

export function ChangePasswordForm() {
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const input = {
      currentPassword: String(fd.get("currentPassword") ?? ""),
      newPassword: String(fd.get("newPassword") ?? ""),
      confirmPassword: String(fd.get("confirmPassword") ?? ""),
    };
    setPending(true);
    try {
      const res = await changePasswordAction(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Password updated");
      form.reset();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> Change password
        </CardTitle>
        <CardDescription>
          Use a unique password you don&apos;t use anywhere else.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" name="newPassword" type="password" minLength={8} required autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {pending ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
