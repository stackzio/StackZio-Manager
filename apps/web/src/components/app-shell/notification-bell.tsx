"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  CreditCard,
  ListChecks,
  Loader2,
  UserPlus,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { NotificationKind } from "@stackzio/db";
import { timeAgo } from "@stackzio/lib/date";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/cn";
import {
  dismissNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  sweepMyNotificationsAction,
} from "@/server/notifications/actions";

interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

interface Props {
  initialUnread: number;
  initialItems: NotificationItem[];
}

const ICON: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  MEETING_TOMORROW: CalendarClock,
  MEETING_SOON: CalendarClock,
  MEETING_STARTED: CalendarClock,
  PROJECT_DEADLINE_NEAR: CircleAlert,
  PROJECT_OVERDUE: CircleAlert,
  PAYMENT_RECORDED: CreditCard,
  MEMBER_JOINED: UserPlus,
  TASK_DUE_SOON: ListChecks,
  TASK_OVERDUE: ListChecks,
  GENERIC: Sparkles,
};

const TONE: Record<NotificationKind, string> = {
  MEETING_TOMORROW: "text-primary bg-primary/10",
  MEETING_SOON: "text-warning bg-warning/10",
  MEETING_STARTED: "text-warning bg-warning/10",
  PROJECT_DEADLINE_NEAR: "text-warning bg-warning/10",
  PROJECT_OVERDUE: "text-destructive bg-destructive/10",
  PAYMENT_RECORDED: "text-success bg-success/10",
  MEMBER_JOINED: "text-primary bg-primary/10",
  TASK_DUE_SOON: "text-warning bg-warning/10",
  TASK_OVERDUE: "text-destructive bg-destructive/10",
  GENERIC: "text-primary bg-primary/10",
};

export function NotificationBell({ initialUnread, initialItems }: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[]>(initialItems);
  const [pending, start] = useTransition();

  // Light polling while the tab is visible. Sweeps + refreshes count every 90s.
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { items: NotificationItem[]; unread: number };
        if (!cancelled) {
          setItems(json.items.map((n) => ({ ...n, createdAt: new Date(n.createdAt), readAt: n.readAt ? new Date(n.readAt) : null })));
          setUnread(json.unread);
        }
      } catch {
        // Network blip — we'll try again on the next tick.
      }
    }
    const id = setInterval(tick, 90_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  async function refresh(sweep = false) {
    const res = await fetch(`/api/notifications${sweep ? "?sweep=1" : ""}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { items: NotificationItem[]; unread: number };
    setItems(json.items.map((n) => ({ ...n, createdAt: new Date(n.createdAt), readAt: n.readAt ? new Date(n.readAt) : null })));
    setUnread(json.unread);
  }

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (v) {
      // Sweep & refresh when opened — fast (sweep is ~ms on small data).
      start(async () => {
        await sweepMyNotificationsAction();
        await refresh();
      });
    }
  }

  function markOne(id: string) {
    start(async () => {
      const res = await markNotificationReadAction(id);
      if (!res.ok) return;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
      setUnread((u) => Math.max(0, u - 1));
    });
  }

  function dismiss(id: string) {
    const wasUnread = items.find((n) => n.id === id)?.readAt == null;
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnread((u) => Math.max(0, u - 1));
    start(async () => {
      await dismissNotificationAction(id);
    });
  }

  function markAll() {
    start(async () => {
      await markAllNotificationsReadAction();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
      setUnread(0);
      toast.success("All marked as read");
    });
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        >
          <Bell className="size-4" />
          <AnimatePresence>
            {unread > 0 ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-gradient px-1 text-[9px] font-semibold text-white shadow"
              >
                {unread > 99 ? "99+" : unread}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex items-center gap-1">
            {pending ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={markAll}
              disabled={pending || unread === 0}
              className="h-7 px-2 text-xs"
            >
              <CheckCheck className="size-3" /> Mark all read
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <Bell className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">You're all caught up</p>
            <p className="text-xs text-muted-foreground">
              We&apos;ll let you know about meetings, overdue projects, payments, and team activity here.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = ICON[n.kind] ?? Sparkles;
                const tone = TONE[n.kind] ?? "text-primary bg-primary/10";
                const inner = (
                  <div className="flex items-start gap-3 p-3 text-sm transition-colors hover:bg-accent/40">
                    <span className={cn("mt-0.5 rounded-md p-1.5", tone)}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate font-medium leading-snug",
                          !n.readAt && "text-foreground",
                          n.readAt && "text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      ) : null}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.readAt ? (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-gradient" />
                    ) : null}
                    <button
                      type="button"
                      aria-label="Dismiss"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dismiss(n.id);
                      }}
                      className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
                return (
                  <li key={n.id} className="group">
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => {
                          markOne(n.id);
                          setOpen(false);
                        }}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => markOne(n.id)} className="block w-full text-left">
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
