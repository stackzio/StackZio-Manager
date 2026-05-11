"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/cn";

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { value?: number }
>(({ className, value = 0, ...props }, ref) => {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="relative h-full w-full flex-1 overflow-hidden rounded-full transition-transform duration-500 ease-out"
        style={{
          transform: `translateX(-${100 - v}%)`,
          backgroundImage: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%)",
        }}
      >
        {/* Soft moving sheen — only shows when there's something to highlight. */}
        {v > 0 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-progress-sheen bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />
        ) : null}
        {/* Top edge highlight for glassiness */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30"
        />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;
