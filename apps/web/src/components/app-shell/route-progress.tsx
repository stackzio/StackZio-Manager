"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * A thin top-of-page gradient progress bar that fires on every link click and
 * settles when the new pathname or query string lands. Server transitions in
 * Next.js block synchronous URL updates without `loading.tsx`, so this gives
 * an instant visual cue that something is happening.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const key = `${pathname}?${search.toString()}`;
  const firstRender = useRef(true);
  const [progress, setProgress] = useState(0);

  // Listen for click intent on internal anchor links → start the bar.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!t) return;
      if (t.target === "_blank") return;
      if (t.hasAttribute("download")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = t.getAttribute("href");
      if (!href) return;
      // External
      if (/^https?:\/\//i.test(href) && !href.startsWith(window.location.origin)) return;
      // Anchor on the same page
      if (href.startsWith("#")) return;
      // Same URL (no nav)
      if (t.href === window.location.href) return;
      setProgress(15);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Whenever the URL key actually changes, ramp up; settle to 100 then fade.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setProgress(70);
    const t1 = setTimeout(() => setProgress(100), 120);
    const t2 = setTimeout(() => setProgress(0), 380);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [key]);

  // Slow creep while pending so the bar never just freezes.
  useEffect(() => {
    if (progress <= 0 || progress >= 90) return;
    const id = setInterval(() => {
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.08 : p));
    }, 220);
    return () => clearInterval(id);
  }, [progress]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
    >
      <div
        className="h-full origin-left"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%)",
          transform: `scaleX(${Math.min(100, progress) / 100})`,
          opacity: progress > 0 ? 1 : 0,
          transition:
            progress >= 100
              ? "opacity 220ms ease-out, transform 200ms ease-out"
              : "transform 220ms ease-out, opacity 120ms ease-in",
        }}
      />
    </div>
  );
}
