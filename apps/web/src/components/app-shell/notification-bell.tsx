"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  CreditCard,
  ListChecks,
  UserPlus,
  X,
  Sparkles,
  Volume2,
  VolumeX,
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

const POLL_INTERVAL_MS = 15_000;
const SOUND_PREF_KEY = "stackzio:notif-sound";

function hydrate(items: NotificationItem[]): NotificationItem[] {
  return items.map((n) => ({
    ...n,
    createdAt: new Date(n.createdAt),
    readAt: n.readAt ? new Date(n.readAt) : null,
  }));
}

/** Soft two-tone synth ding via WebAudio — no asset, no network. */
function playDing(volume = 0.18) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const tones = [
      { f: 880, t: 0 },
      { f: 1320, t: 0.09 },
    ];
    for (const { f, t } of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(volume, now + t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.4);
    }
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    // sound is best-effort
  }
}

export function NotificationBell({ initialUnread, initialItems }: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[]>(initialItems);
  const [marking, setMarking] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [pulse, setPulse] = useState(false);

  // Track the latest seen notification id so we can detect *new* arrivals.
  const latestSeenIdRef = useRef<string | null>(initialItems[0]?.id ?? null);
  // Avoid double-firing toasts/sound on the very first hydration tick.
  const initializedRef = useRef(false);

  // Load sound preference.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SOUND_PREF_KEY);
    if (stored === "0") setSoundOn(false);
  }, []);

  function toggleSound() {
    setSoundOn((s) => {
      const next = !s;
      try {
        window.localStorage.setItem(SOUND_PREF_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Ask for browser notification permission on first interaction.
  const askPermissionIfNeeded = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const fireBrowserNotification = useCallback((n: NotificationItem) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return; // only when not on the tab
    try {
      const note = new Notification(n.title, {
        body: n.body ?? undefined,
        icon: "/icon.png",
        badge: "/icon.png",
        tag: n.id,
      });
      note.onclick = () => {
        window.focus();
        if (n.link) window.location.href = n.link;
        note.close();
      };
    } catch {
      /* ignore */
    }
  }, []);

  const announceNew = useCallback(
    (newOnes: NotificationItem[]) => {
      if (newOnes.length === 0) return;
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
      if (soundOn) playDing();
      // Show a toast for the freshest one with a CTA if linkable.
      const top = newOnes[0]!;
      toast(top.title, {
        description: top.body ?? undefined,
        action: top.link
          ? {
              label: "Open",
              onClick: () => {
                window.location.href = top.link!;
              },
            }
          : undefined,
        duration: 6000,
      });
      // Cross-tab popup via Browser Notification API.
      newOnes.forEach(fireBrowserNotification);
    },
    [soundOn, fireBrowserNotification],
  );

  const fetchAndDiff = useCallback(
    async (opts: { sweep?: boolean; silent?: boolean } = {}) => {
      try {
        const res = await fetch(`/api/notifications${opts.sweep ? "?sweep=1" : ""}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { items: NotificationItem[]; unread: number };
        const fresh = hydrate(json.items);

        // Detect new items strictly: createdAt > latest known + id mismatch.
        if (initializedRef.current && !opts.silent) {
          const lastId = latestSeenIdRef.current;
          const newOnes: NotificationItem[] = [];
          for (const n of fresh) {
            if (n.id === lastId) break;
            if (n.readAt) continue; // only celebrate unread arrivals
            newOnes.push(n);
          }
          if (newOnes.length > 0) announceNew(newOnes);
        }

        latestSeenIdRef.current = fresh[0]?.id ?? latestSeenIdRef.current;
        initializedRef.current = true;
        setItems(fresh);
        setUnread(json.unread);
      } catch {
        // Network blip — try again next tick.
      }
    },
    [announceNew],
  );

  // Poll while the tab is visible. Refresh once on tab refocus.
  useEffect(() => {
    initializedRef.current = false;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timer) return;
      // First tick: silent, just to seed `initializedRef`.
      void fetchAndDiff({ silent: !initializedRef.current });
      timer = setInterval(() => {
        if (cancelled) return;
        if (document.visibilityState !== "visible") return;
        void fetchAndDiff();
      }, POLL_INTERVAL_MS);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
    function onVis() {
      if (document.visibilityState === "visible") {
        start();
        // Catch up immediately on refocus.
        void fetchAndDiff();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchAndDiff]);

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (v) {
      askPermissionIfNeeded();
      // Sweep silently in the background — never block the panel UI.
      void (async () => {
        try {
          await sweepMyNotificationsAction();
          await fetchAndDiff({ silent: true });
        } catch {
          /* ignore */
        }
      })();
    }
  }

  function markOne(id: string) {
    // Optimistic update — don't wait on server before UI changes.
    setItems((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date() } : n)));
    setUnread((u) => {
      const target = items.find((n) => n.id === id);
      return target && !target.readAt ? Math.max(0, u - 1) : u;
    });
    void markNotificationReadAction(id).catch(() => {});
  }

  function dismiss(id: string) {
    const wasUnread = items.find((n) => n.id === id)?.readAt == null;
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnread((u) => Math.max(0, u - 1));
    void dismissNotificationAction(id).catch(() => {});
  }

  function markAll() {
    if (unread === 0) return;
    setMarking(true);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnread(0);
    void markAllNotificationsReadAction()
      .then(() => toast.success("All marked as read"))
      .catch(() => toast.error("Couldn't mark all as read"))
      .finally(() => setMarking(false));
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
          <motion.span
            animate={pulse ? { rotate: [0, -12, 12, -8, 8, 0] } : { rotate: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="inline-flex"
          >
            {unread > 0 ? <BellRing className="size-4" /> : <Bell className="size-4" />}
          </motion.span>
          <AnimatePresence>
            {unread > 0 ? (
              <motion.span
                key={unread}
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
          {pulse ? (
            <motion.span
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 1.9 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 rounded-full bg-primary/40"
            />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {unread} new
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              className="size-7"
              aria-label={soundOn ? "Mute notification sound" : "Unmute notification sound"}
              title={soundOn ? "Sound on" : "Sound off"}
            >
              {soundOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={markAll}
              disabled={marking || unread === 0}
              className="h-7 px-2 text-xs"
            >
              <CheckCheck className="size-3" /> Mark all read
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 p-8 text-center"
          >
            <Bell className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground">
              We&apos;ll let you know about meetings, overdue projects, payments, and team activity here.
            </p>
          </motion.div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <ul className="divide-y">
              <AnimatePresence initial={false}>
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
                    <motion.li
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.18 }}
                      className="group"
                    >
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
                        <button
                          type="button"
                          onClick={() => markOne(n.id)}
                          className="block w-full text-left"
                        >
                          {inner}
                        </button>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
