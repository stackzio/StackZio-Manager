"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Always log so it shows up in browser devtools + Vercel runtime logs
    console.error("[GlobalError]", error.message, error.digest, error.stack);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Error</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Try again, or share the details below if the problem
          persists.
        </p>
        <details className="mt-4 rounded-lg border bg-muted/30 p-3 text-left text-xs">
          <summary className="cursor-pointer font-medium">Error details</summary>
          <p className="mt-2 break-words font-mono text-[11px]">{error.message || "(no message)"}</p>
          {error.digest ? (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              digest: {error.digest}
            </p>
          ) : null}
        </details>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()} variant="gradient">
          Try again
        </Button>
        <Button onClick={() => (window.location.href = "/dashboard")} variant="outline">
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
