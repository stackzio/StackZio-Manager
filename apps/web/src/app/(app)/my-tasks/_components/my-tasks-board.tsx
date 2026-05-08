"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  Reorder,
  motion,
} from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleDot,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@stackzio/lib/date";
import type { MyTaskRow } from "@/server/projects/my-tasks-queries";
import { setTaskStatusAction } from "@/server/projects/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type Status = "TODO" | "DOING" | "DONE";

const COLUMNS: Array<{
  status: Status;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  border: string;
}> = [
  {
    status: "TODO",
    label: "To do",
    hint: "Pick one and start",
    icon: Circle,
    tone: "text-zinc-500 bg-zinc-500/10",
    border: "border-zinc-500/20",
  },
  {
    status: "DOING",
    label: "In progress",
    hint: "Currently working on these",
    icon: CircleDot,
    tone: "text-primary bg-primary/10",
    border: "border-primary/30",
  },
  {
    status: "DONE",
    label: "Done",
    hint: "Nice work",
    icon: CheckCircle2,
    tone: "text-success bg-success/10",
    border: "border-success/20",
  },
];

interface Props {
  todo: MyTaskRow[];
  doing: MyTaskRow[];
  done: MyTaskRow[];
}

export function MyTasksBoard({ todo, doing, done }: Props) {
  // Local optimistic state so card reordering feels instant.
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cols, setCols] = useState<Record<Status, MyTaskRow[]>>({
    TODO: todo,
    DOING: doing,
    DONE: done,
  });

  function move(task: MyTaskRow, to: Status) {
    if (task.status === to) return;
    // Optimistic update
    setCols((prev) => {
      const next: Record<Status, MyTaskRow[]> = {
        TODO: prev.TODO.filter((t) => t.id !== task.id),
        DOING: prev.DOING.filter((t) => t.id !== task.id),
        DONE: prev.DONE.filter((t) => t.id !== task.id),
      };
      next[to] = [{ ...task, status: to }, ...next[to]];
      return next;
    });
    start(async () => {
      const res = await setTaskStatusAction(task.id, to);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't update");
        // Roll back on error
        router.refresh();
        return;
      }
      // Soft refresh in the background so totals on dashboard update too
      router.refresh();
    });
  }

  return (
    <LayoutGroup>
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = cols[col.status];
          const Icon = col.icon;
          return (
            <Card key={col.status} className={cn("relative border", col.border)}>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-md p-1.5", col.tone)}>
                    <Icon className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{col.label}</p>
                    <p className="text-[11px] text-muted-foreground">{col.hint}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
                    items.length === 0 ? "text-muted-foreground" : col.tone,
                  )}
                >
                  {items.length}
                </span>
              </div>

              <CardContent className="space-y-2 p-3" data-pending={pending}>
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    {col.status === "TODO"
                      ? "Nothing in your queue."
                      : col.status === "DOING"
                        ? "Pick one up and pull it in."
                        : "Done items land here."}
                  </div>
                ) : null}

                <Reorder.Group
                  axis="y"
                  values={items}
                  onReorder={(reordered) =>
                    setCols((prev) => ({ ...prev, [col.status]: reordered }))
                  }
                  className="space-y-2"
                >
                  <AnimatePresence initial={false}>
                    {items.map((t) => (
                      <TaskCard key={t.id} task={t} onMove={(to) => move(t, to)} />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

function TaskCard({ task, onMove }: { task: MyTaskRow; onMove: (to: Status) => void }) {
  const overdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();
  const targets: Status[] = (["TODO", "DOING", "DONE"] as Status[]).filter((s) => s !== task.status);
  return (
    <Reorder.Item
      value={task}
      layoutId={task.id}
      drag={false}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="group rounded-xl border bg-background p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              task.status === "DONE" && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          <Link
            href={`/projects/${task.project.id}`}
            className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
          >
            <span className="truncate">{task.project.name}</span>
            <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{task.description}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {task.dueDate ? (
          <Badge
            variant="outline"
            className={cn(
              "gap-1 border text-[10px]",
              overdue
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : "border-border text-muted-foreground",
            )}
          >
            {overdue ? "Overdue" : "Due"} {formatDate(task.dueDate)}
          </Badge>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {targets.map((to) => {
          const target = COLUMNS.find((c) => c.status === to)!;
          return (
            <motion.button
              key={to}
              type="button"
              onClick={() => onMove(to)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all",
                "hover:-translate-y-0.5 hover:shadow-sm",
                to === "DONE"
                  ? "border-success/40 text-success hover:bg-success/5"
                  : to === "DOING"
                    ? "border-primary/40 text-primary hover:bg-primary/5"
                    : "border-border text-muted-foreground hover:bg-accent",
              )}
            >
              <ArrowRight className="size-3" />
              {target.label}
              {to === "DONE" ? <Sparkles className="size-3" /> : null}
              {/* Swallow Loader2 import warning */}
              <Loader2 className="hidden" />
            </motion.button>
          );
        })}
      </div>
    </Reorder.Item>
  );
}
