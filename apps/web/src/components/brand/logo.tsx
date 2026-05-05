import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { mark: 18, text: "text-sm" },
  md: { mark: 22, text: "text-base" },
  lg: { mark: 32, text: "text-xl" },
} as const;

export function Logo({ className, showWordmark = true, size = "md" }: LogoProps) {
  const cfg = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark size={cfg.mark} />
      {showWordmark && (
        <span className={cn("font-bold tracking-tight", cfg.text)}>
          <span className="text-foreground">Stack</span>
          <span className="text-gradient-brand">Zio</span>
        </span>
      )}
    </div>
  );
}

export function LogoMark({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/transparant-mark.png"
      alt="StackZio"
      width={size}
      height={size}
      priority
      unoptimized
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}
