"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "@/server/auth/actions";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    setPending(true);
    try {
      const res = await signupAction({ name, email, password });
      if (!res.ok) {
        if (res.field && res.field !== "form") setErrors({ [res.field]: res.error });
        toast.error(res.error);
        return;
      }
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (!signInRes || signInRes.error) {
        toast.error("Account created. Please sign in.");
        router.push("/login");
        return;
      }
      toast.success("Welcome to StackZio");
      router.push("/onboarding/create-organization");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {googleEnabled && (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/onboarding/create-organization" })}
            disabled={pending}
          >
            Continue with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Full name" id="name" error={errors.name}>
          <Input id="name" name="name" required autoComplete="name" placeholder="Jane Doe" />
        </Field>
        <Field label="Email" id="email" error={errors.email}>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label="Password" id="password" error={errors.password} hint="At least 8 characters">
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPwd ? "text" : "password"}
              minLength={8}
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              aria-label={showPwd ? "Hide password" : "Show password"}
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  id,
  error,
  hint,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
