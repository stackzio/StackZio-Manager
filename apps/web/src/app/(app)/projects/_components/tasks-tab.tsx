"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  CircleDot,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { TaskStatus } from "@stackzio/db";
import { formatDate } from "@stackzio/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createTaskAction,
  deleteTaskAction,
  setTaskStatusAction,
} from "@/server/projects/actions";
import { cn } from "@/lib/cn";
import type { MemberOption } from "./member-multiselect";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: Date | null;
  assignee: { id: string; name: string | null; email: string; image: string | null } | null;
}

interface Props {
  projectId: string;
  tasks: Task[];
  members: MemberOption[];
  canEdit: boolean;
}

const NONE = "__none__";

const COLUMNS: Array<{
  status: TaskStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  border: string;
}> = [
  { status: "TODO", label: "To do", icon: Circle, tone: "text-zinc-500 bg-zinc-500/10", border: "border-zinc-500/20" },
  { status: "DOING", label: "Doing", icon: CircleDot, tone: "text-primary bg-primary/10", border: "border-primary/20" },
  { status: "DONE", label: "Done", icon: CheckCircle2, tone: "text-success bg-success/10", border: "border-success/20" },
];

export function TasksTab({ projectId, tasks, members, canEdit }: Props) {
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>(NONE);
  const [status, setStatus] = useState<TaskStatus>("TODO");

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const input = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      status,
      assigneeId: assigneeId === NONE ? "" : assigneeId,
      dueDate: String(fd.get("dueDate") ?? ""),
    };
    if (!input.title) return;
    start(async () => {
      const res = await createTaskAction(projectId, input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Task added");
      setShowForm(false);
      setAssigneeId(NONE);
      setStatus("TODO");
      form.reset();
    });
  }

  function move(t: Task, next: TaskStatus) {
    if (t.status === next) return;
    start(async () => {
      const res = await setTaskStatusAction(t.id, next);
      if (!res.ok) toast.error(res.error ?? "Could not update");
    });
  }

  function remove(t: Task) {
    start(async () => {
      const res = await deleteTaskAction(t.id);
      if (!res.ok) toast.error(res.error ?? "Could not delete");
    });
  }

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const grouped: Record<TaskStatus, Task[]> = {
    TODO: tasks.filter((t) => t.status === "TODO"),
    DOING: tasks.filter((t) => t.status === "DOING"),
    DONE: tasks.filter((t) => t.status === "DONE"),
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="min-w-[200px] flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-wider text-muted-foreground">
                Tasks completed
              </span>
              <span className="font-semibold tabular-nums">
                {done} / {total} · {pct}%
              </span>
            </div>
            <Progress value={pct} className="mt-1.5" />
          </div>
          {canEdit ? (
            <Button type="button" variant="gradient" onClick={() => setShowForm((v) => !v)}>
              <Plus className="size-4" /> Add task
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {showForm && canEdit ? (
        <motion.form
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={onCreate}
          className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required maxLength={200} placeholder="What needs doing?" autoFocus />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" maxLength={1000} placeholder="Notes (optional)" />
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name ?? m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">To do</SelectItem>
                <SelectItem value="DOING">Doing</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" name="dueDate" type="date" />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Add task
            </Button>
          </div>
        </motion.form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const items = grouped[col.status];
          return (
            <Card key={col.status} className={cn("border", col.border)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className={cn("rounded-md p-1.5", col.tone)}>
                    <Icon className="size-3.5" />
                  </span>
                  {col.label}
                  <Badge variant="secondary" className="ml-auto">
                    {items.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Nothing here.
                  </p>
                ) : (
                  items.map((t) => {
                    const initials = t.assignee
                      ? (t.assignee.name ?? t.assignee.email)
                          .split(/[\s.@]+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((s) => s[0]?.toUpperCase())
                          .join("")
                      : null;
                    const overdue =
                      t.dueDate && t.status !== "DONE" && new Date(t.dueDate) < new Date();
                    return (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group rounded-xl border bg-background p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <p
                          className={cn(
                            "text-sm font-medium leading-snug",
                            t.status === "DONE" && "text-muted-foreground line-through",
                          )}
                        >
                          {t.title}
                        </p>
                        {t.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2 text-[11px]">
                          {t.assignee ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Avatar className="size-5">
                                {t.assignee.image ? <AvatarImage src={t.assignee.image} alt="" /> : null}
                                <AvatarFallback className="text-[8px]">{initials || "U"}</AvatarFallback>
                              </Avatar>
                              <span className="max-w-[120px] truncate">{t.assignee.name ?? t.assignee.email}</span>
                            </div>
                          ) : null}
                          {t.dueDate ? (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5",
                                overdue
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {overdue ? "Overdue · " : "Due "}
                              {formatDate(t.dueDate)}
                            </span>
                          ) : null}
                          {canEdit ? (
                            <button
                              type="button"
                              aria-label="Delete task"
                              onClick={() => remove(t)}
                              className="ml-auto rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          ) : null}
                        </div>
                        {canEdit ? (
                          <div className="mt-2 flex gap-1">
                            {COLUMNS.filter((c) => c.status !== t.status).map((c) => (
                              <button
                                key={c.status}
                                type="button"
                                onClick={() => move(t, c.status)}
                                disabled={pending}
                                className="rounded-md border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                              >
                                → {c.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tasks.length === 0 && !showForm ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <p className="text-sm font-medium">No tasks yet</p>
            <CardDescription>Break the project into actionable steps.</CardDescription>
            {canEdit ? (
              <Button type="button" variant="gradient" onClick={() => setShowForm(true)}>
                <Plus className="size-4" /> Add the first task
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
