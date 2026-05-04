"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TaskStatus } from "@stackzio/db";
import { formatDate } from "@stackzio/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function TasksTab({ projectId, tasks, members, canEdit }: Props) {
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>(NONE);
  const [status, setStatus] = useState<TaskStatus>("TODO");

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      status,
      assigneeId: assigneeId === NONE ? "" : assigneeId,
      dueDate: String(fd.get("dueDate") ?? ""),
    };
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
      (e.target as HTMLFormElement).reset();
    });
  }

  function onToggle(t: Task) {
    const nextStatus: TaskStatus = t.status === "DONE" ? "TODO" : "DONE";
    start(async () => {
      const res = await setTaskStatusAction(t.id, nextStatus);
      if (!res.ok) toast.error(res.error ?? "Could not update");
    });
  }

  function onDelete(t: Task) {
    start(async () => {
      const res = await deleteTaskAction(t.id);
      if (!res.ok) toast.error(res.error ?? "Could not delete");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Break the project into actionable steps.</CardDescription>
          </div>
          {canEdit ? (
            <Button type="button" variant="gradient" size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="size-4" /> Add task
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && canEdit ? (
            <form onSubmit={onCreate} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required maxLength={200} placeholder="What needs doing?" />
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
            </form>
          ) : null}

          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-3 p-3">
                  {canEdit ? (
                    <Checkbox
                      checked={t.status === "DONE"}
                      onCheckedChange={() => onToggle(t)}
                      className="mt-0.5"
                      aria-label={t.status === "DONE" ? "Mark as not done" : "Mark as done"}
                    />
                  ) : (
                    <span className="mt-0.5">
                      {t.status === "DONE" ? "✅" : t.status === "DOING" ? "▶" : "○"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        t.status === "DONE" ? "text-muted-foreground line-through" : "",
                      )}
                    >
                      {t.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{t.status}</span>
                      {t.dueDate ? <span>· due {formatDate(t.dueDate)}</span> : null}
                      {t.assignee ? (
                        <span className="flex items-center gap-1">
                          ·{" "}
                          <Avatar className="size-4">
                            {t.assignee.image ? <AvatarImage src={t.assignee.image} alt="" /> : null}
                            <AvatarFallback className="text-[8px]">
                              {(t.assignee.name ?? t.assignee.email).slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {t.assignee.name ?? t.assignee.email}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {canEdit ? (
                    <Button variant="ghost" size="icon" onClick={() => onDelete(t)} aria-label="Delete task">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
