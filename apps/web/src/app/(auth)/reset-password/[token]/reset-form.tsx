"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/server/password-reset/actions";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setPending(true);
    try {
      const res = await resetPasswordAction({ token, password });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Password updated. Sign in with your new password.");
      router.push("/login");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            minLength={8}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            aria-label={show ? "Hide" : "Show"}
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type={show ? "text" : "password"}
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
