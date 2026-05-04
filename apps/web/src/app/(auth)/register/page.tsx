import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";
import { hasGoogleAuth } from "@/lib/env";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start managing your agencies in minutes.
      </p>
      <div className="mt-8">
        <RegisterForm googleEnabled={hasGoogleAuth} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
