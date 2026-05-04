"use client";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Error</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          An unexpected error occurred. Try again or return to the dashboard.
        </p>
      </div>
      <Button onClick={() => reset()} variant="gradient">
        Try again
      </Button>
    </div>
  );
}
