import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@stackzio/db";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  const isValid =
    !!record && record.kind === "PASSWORD_RESET" && record.expires > new Date();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isValid ? "Choose a strong password you haven’t used before." : "This reset link is no longer valid."}
      </p>
      <div className="mt-8">
        {isValid ? (
          <ResetForm token={token} />
        ) : (
          <div className="space-y-4">
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Request a new link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
