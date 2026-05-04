import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { hasGoogleAuth } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign in to your StackZio Manager account.
      </p>
      <div className="mt-8">
        <LoginForm googleEnabled={hasGoogleAuth} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
