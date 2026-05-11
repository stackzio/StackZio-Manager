"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  Loader2,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { ProjectUpdateKind } from "@stackzio/db";
import { timeAgo } from "@stackzio/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProjectUpdateAction,
  postProjectUpdateAction,
  toggleUpdateReactionAction,
} from "@/server/projects/updates-actions";
import { cn } from "@/lib/cn";

interface Reaction {
  id: string;
  userId: string;
  emoji: string;
}

export interface UpdateItem {
  id: string;
  body: string;
  kind: ProjectUpdateKind;
  createdAt: Date;
  authorId: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  reactions: Reaction[];
}

interface CurrentUser {
  id: string;
  name: string | null | undefined;
  email: string;
  image: string | null | undefined;
}

interface Props {
  projectId: string;
  updates: UpdateItem[];
  currentUser: CurrentUser;
  isAdmin: boolean;
  canPost: boolean;
}

const KIND_OPTIONS: Array<{
  value: ProjectUpdateKind;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  border: string;
}> = [
  {
    value: "UPDATE",
    label: "Update",
    icon: MessageSquare,
    tone: "text-primary bg-primary/10",
    border: "border-primary/20",
  },
  {
    value: "MILESTONE",
    label: "Milestone",
    icon: CheckCircle2,
    tone: "text-emerald-500 bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    value: "BLOCKER",
    label: "Blocker",
    icon: AlertOctagon,
    tone: "text-destructive bg-destructive/10",
    border: "border-destructive/20",
  },
  {
    value: "ANNOUNCEMENT",
    label: "Announcement",
    icon: Megaphone,
    tone: "text-warning bg-warning/10",
    border: "border-warning/20",
  },
];

const REACTION_EMOJIS = ["👍", "🎉", "🔥", "❤️", "👀"];

function tempId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function UpdatesTab({
  projectId,
  updates,
  currentUser,
  isAdmin,
  canPost,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<UpdateItem[]>(updates);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<ProjectUpdateKind>("UPDATE");
  const [posting, setPosting] = useState(false);

  // Keep local state in sync if the server pushes a new list (e.g. another
  // page in this tab caused a router.refresh). We trust the server snapshot
  // — it wipes our optimistic temp ids by id mismatch, but those are already
  // settled to real ids by the time refresh lands.
  useEffect(() => {
    setItems(updates);
  }, [updates]);

  // Track which optimistic items we're currently submitting, so we can
  // restore on error without snapshotting the whole list each time.
  const inFlightReactionKey = useRef(new Set<string>());

  async function post() {
    const text = body.trim();
    if (!text || posting) return;
    const draftKind = kind;

    // 1. Optimistic insert — clear the composer instantly.
    const placeholderId = tempId("update");
    const placeholder: UpdateItem = {
      id: placeholderId,
      body: text,
      kind: draftKind,
      createdAt: new Date(),
      authorId: currentUser.id,
      author: {
        id: currentUser.id,
        name: currentUser.name ?? null,
        email: currentUser.email,
        image: currentUser.image ?? null,
      },
      reactions: [],
    };
    setItems((prev) => [placeholder, ...prev]);
    setBody("");
    setKind("UPDATE");
    setPosting(true);

    try {
      const res = await postProjectUpdateAction(projectId, {
        body: text,
        kind: draftKind,
      });
      if (!res.ok) {
        toast.error(res.error);
        // Roll back placeholder.
        setItems((prev) => prev.filter((u) => u.id !== placeholderId));
        // Put the text back so the user doesn't lose their draft.
        setBody(text);
        setKind(draftKind);
        return;
      }
      // 2. Swap placeholder → real row from the server. We keep our local
      //    reactions array empty since the server can't have any yet.
      setItems((prev) =>
        prev.map((u) =>
          u.id === placeholderId
            ? {
                id: res.update.id,
                body: res.update.body,
                kind: res.update.kind,
                createdAt: new Date(res.update.createdAt),
                authorId: res.update.authorId,
                author: res.update.author,
                reactions: [],
              }
            : u,
        ),
      );
      // 3. Background refresh so anything else on the page that depends on
      //    the project (e.g. activity feed) catches up. Doesn't block the UI.
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post update");
      setItems((prev) => prev.filter((u) => u.id !== placeholderId));
      setBody(text);
      setKind(draftKind);
    } finally {
      setPosting(false);
    }
  }

  function react(updateId: string, emoji: string) {
    // Compute optimistic toggle: is the current user already reacting with
    // this emoji on this update?
    let willAdd = false;
    setItems((prev) =>
      prev.map((u) => {
        if (u.id !== updateId) return u;
        const existing = u.reactions.find(
          (r) => r.userId === currentUser.id && r.emoji === emoji,
        );
        if (existing) {
          willAdd = false;
          return {
            ...u,
            reactions: u.reactions.filter((r) => r.id !== existing.id),
          };
        }
        willAdd = true;
        return {
          ...u,
          reactions: [
            ...u.reactions,
            {
              id: tempId("rx"),
              userId: currentUser.id,
              emoji,
            },
          ],
        };
      }),
    );

    // Dedupe rapid double-taps on the same emoji while the server roundtrip
    // is in flight — they cancel each other out optimistically anyway.
    const key = `${updateId}:${emoji}`;
    if (inFlightReactionKey.current.has(key)) {
      // Already in flight — the toggle we just applied locally will diverge
      // from the server. Schedule a refresh to reconcile after settle.
      void Promise.resolve().then(() => router.refresh());
      return;
    }
    inFlightReactionKey.current.add(key);

    void (async () => {
      try {
        const res = await toggleUpdateReactionAction(updateId, { emoji });
        if (!res.ok) {
          toast.error(res.error ?? "Could not react");
          // Revert by re-toggling locally.
          setItems((prev) =>
            prev.map((u) => {
              if (u.id !== updateId) return u;
              if (willAdd) {
                return {
                  ...u,
                  reactions: u.reactions.filter(
                    (r) =>
                      !(r.userId === currentUser.id && r.emoji === emoji && r.id.startsWith("rx-")),
                  ),
                };
              }
              return {
                ...u,
                reactions: [
                  ...u.reactions,
                  {
                    id: tempId("rx-restore"),
                    userId: currentUser.id,
                    emoji,
                  },
                ],
              };
            }),
          );
        }
      } finally {
        inFlightReactionKey.current.delete(key);
      }
    })();
  }

  function remove(updateId: string) {
    const snapshot = items;
    setItems((prev) => prev.filter((u) => u.id !== updateId));
    void (async () => {
      const res = await deleteProjectUpdateAction(updateId);
      if (!res.ok) {
        toast.error(res.error ?? "Could not delete");
        setItems(snapshot);
      }
    })();
  }

  return (
    <div className="space-y-6">
      {canPost ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Post an update
            </CardTitle>
            <CardDescription>
              Share progress, flag blockers, or announce milestones —
              everyone on this project gets notified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {KIND_OPTIONS.map((k) => {
                const Icon = k.icon;
                const active = kind === k.value;
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      "hover:border-primary/40",
                      active
                        ? cn("border", k.border, k.tone)
                        : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {k.label}
                  </button>
                );
              })}
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's happening on this project?"
              className="min-h-[90px]"
              maxLength={4000}
              onKeyDown={(e) => {
                // Cmd/Ctrl+Enter posts the update.
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void post();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {body.length}/4000 ·{" "}
                <span className="hidden sm:inline">⌘+Enter to post</span>
              </p>
              <Button
                onClick={post}
                variant="gradient"
                disabled={posting || !body.trim()}
              >
                {posting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Post update
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="rounded-full bg-brand-gradient p-3 text-white shadow-glow-sm">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold">No updates yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {canPost
                  ? "Start the conversation with the first update."
                  : "Updates from the team will appear here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ol className="relative ml-3 space-y-4 border-l border-border pl-6">
          <AnimatePresence initial={false}>
            {items.map((u) => {
              const opt =
                KIND_OPTIONS.find((o) => o.value === u.kind) ?? KIND_OPTIONS[0]!;
              const Icon = opt.icon;
              const initials = (u.author.name ?? u.author.email)
                .split(/[\s.@]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase())
                .join("");
              const grouped: Record<string, string[]> = {};
              for (const r of u.reactions) {
                (grouped[r.emoji] ??= []).push(r.userId);
              }
              const isAuthor = u.authorId === currentUser.id;
              const canDelete = isAuthor || isAdmin;
              const isPending = u.id.startsWith("update-");
              return (
                <motion.li
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: isPending ? 0.75 : 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  <span
                    className={cn(
                      "absolute -left-3 mt-2 flex size-6 items-center justify-center rounded-full border bg-background shadow-sm",
                      opt.tone,
                    )}
                  >
                    <Icon className="size-3" />
                  </span>
                  <Card className={cn("border", opt.border)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="size-9">
                          {u.author.image ? (
                            <AvatarImage
                              src={u.author.image}
                              alt={u.author.name ?? u.author.email}
                            />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {initials || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">
                              {u.author.name ?? u.author.email}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", opt.tone)}
                            >
                              {opt.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {timeAgo(u.createdAt)}
                            </span>
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Loader2 className="size-2.5 animate-spin" />
                                Posting…
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                            {u.body}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {Object.entries(grouped).map(([emoji, userIds]) => {
                              const mine = userIds.includes(currentUser.id);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => react(u.id, emoji)}
                                  disabled={isPending}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all active:scale-95",
                                    mine
                                      ? "border-primary bg-primary/15 text-primary shadow-glow-sm"
                                      : "hover:border-primary/40 hover:bg-accent",
                                  )}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-medium tabular-nums">
                                    {userIds.length}
                                  </span>
                                </button>
                              );
                            })}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 rounded-full px-2 text-xs"
                                  disabled={isPending}
                                >
                                  <Sparkles className="size-3" /> React
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <div className="flex gap-1 px-1.5 py-1">
                                  {REACTION_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => react(u.id, emoji)}
                                      className="rounded-md p-1.5 text-lg transition-colors hover:bg-accent active:scale-90"
                                      aria-label={`React with ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        {canDelete ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                aria-label="More"
                                disabled={isPending}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => remove(u.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
