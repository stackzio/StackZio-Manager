"use client";

import { useSidebar } from "@/components/app-shell/sidebar-context";
import { cn } from "@/lib/cn";

export function MainPane({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={cn(
        "flex min-h-screen flex-1 flex-col transition-[padding] duration-300 ease-out",
        collapsed ? "lg:pl-[72px]" : "lg:pl-64",
      )}
    >
      {children}
    </div>
  );
}
