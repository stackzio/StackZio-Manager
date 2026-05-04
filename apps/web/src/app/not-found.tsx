import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">404</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or has moved.
        </p>
      </div>
      <Button asChild variant="gradient">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
