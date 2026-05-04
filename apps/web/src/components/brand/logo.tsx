import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark className="size-8" />
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight">
          <span className="text-foreground">Stack</span>
          <span className="text-gradient-brand">Zio</span>
        </span>
      )}
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-brand-600", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="szg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="60%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <path
        d="M48 13H22a8 8 0 0 0 0 16h20a8 8 0 0 1 0 16H16"
        stroke="url(#szg)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M28 31h12"
        stroke="url(#szg)"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}
