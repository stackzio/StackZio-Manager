import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldX } from "lucide-react";
import { prisma } from "@stackzio/db";
import { auth } from "@/server/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AcceptInviteButton } from "./accept-invite";

export const metadata: Metadata = { title: "Invite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true, slug: true, logoUrl: true, description: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  const session = await auth();
  const expired = !invite || invite.expiresAt < new Date();
  const consumed = invite?.acceptedAt != null;

  if (!invite || expired || consumed) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <div className="mx-auto rounded-full bg-destructive/10 p-3 text-destructive">
              <ShieldX className="size-5" />
            </div>
            <CardTitle className="mt-2 text-center">Invite is no longer valid</CardTitle>
            <CardDescription className="text-center">
              {consumed ? "This invite has already been used." : "It has expired or been revoked."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="gradient">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const emailMismatch = session.user.email.toLowerCase() !== invite.email.toLowerCase();
  const initials = invite.organization.name.slice(0, 2).toUpperCase();

  return (
    <Shell>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center">
            <Avatar className="size-14 rounded-2xl">
              {invite.organization.logoUrl ? (
                <AvatarImage src={invite.organization.logoUrl} alt={invite.organization.name} />
              ) : null}
              <AvatarFallback className="rounded-2xl text-base">{initials}</AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="mt-3 text-center">
            Join <span className="text-gradient-brand">{invite.organization.name}</span>
          </CardTitle>
          <CardDescription className="text-center">
            {invite.invitedBy.name ?? invite.invitedBy.email} invited you as {" "}
            <span className="font-medium text-foreground">{invite.role}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invite.organization.description ? (
            <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              {invite.organization.description}
            </p>
          ) : null}
          {emailMismatch ? (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
              <p>
                This invite was sent to <span className="font-medium">{invite.email}</span>, but you&apos;re signed in as <span className="font-medium">{session.user.email}</span>.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sign in with the matching account to accept.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success-foreground/90">
              <CheckCircle2 className="size-4 text-success" />
              <span className="text-foreground/90">All good — accept to join.</span>
            </div>
          )}
          <AcceptInviteButton token={token} disabled={emailMismatch} />
        </CardContent>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-md px-6 py-12">{children}</main>
    </div>
  );
}
