"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProjectAction, updateProjectAction } from "@/server/projects/actions";
import { PROJECT_CATEGORY, PROJECT_STATUS, type UpsertProjectInput } from "@/server/projects/schemas";
import { MemberMultiselect, type MemberOption } from "./member-multiselect";

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}

interface Props {
  mode: "create" | "edit";
  projectId?: string;
  clients: ClientOption[];
  members: MemberOption[];
  initial?: Partial<UpsertProjectInput> & {
    deadlineISO?: string;
    startDateISO?: string;
  };
  defaultCurrency: string;
  isAdmin: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  SHOPIFY: "Shopify",
  WEBSITE: "Website",
  SOFTWARE: "Software",
  MOBILE_APP: "Mobile app",
  BRANDING: "Branding",
  MARKETING: "Marketing",
  OTHER: "Other",
};
const STATUS_LABEL: Record<string, string> = {
  LEAD: "Lead",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function ProjectForm({ mode, projectId, clients, members, initial, defaultCurrency, isAdmin }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [memberIds, setMemberIds] = useState<string[]>(initial?.memberIds ?? []);
  const [category, setCategory] = useState<string>(initial?.category ?? "WEBSITE");
  const [status, setStatus] = useState<string>(initial?.status ?? "LEAD");
  const [clientId, setClientId] = useState<string>(initial?.clientId ?? "");
  const [ownerId, setOwnerId] = useState<string>(initial?.ownerId ?? "");
  const [progressPct, setProgressPct] = useState<number>(Number(initial?.progressPct ?? 0));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input: UpsertProjectInput = {
      name: String(fd.get("name") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      clientId,
      ownerId,
      category: category as (typeof PROJECT_CATEGORY)[number],
      status: status as (typeof PROJECT_STATUS)[number],
      priceTotal: Number(fd.get("priceTotal") ?? 0),
      currency: String(fd.get("currency") ?? defaultCurrency).trim().toUpperCase(),
      startDate: String(fd.get("startDate") ?? ""),
      deadline: String(fd.get("deadline") ?? ""),
      progressPct: progressPct,
      memberIds,
    };
    start(async () => {
      const res =
        mode === "create"
          ? await createProjectAction(input)
          : await updateProjectAction(projectId!, input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "create" ? "Project created" : "Project updated");
      router.push(`/projects/${res.projectId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Project name" id="name" required className="sm:col-span-2">
            <Input id="name" name="name" required defaultValue={initial?.name ?? ""} maxLength={160} />
          </Field>
          <Field label="Client" id="clientId" required>
            <Select value={clientId} onValueChange={setClientId} disabled={!isAdmin && mode === "edit"}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` · ${c.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Owner" id="ownerId" required>
            <Select value={ownerId} onValueChange={setOwnerId} disabled={!isAdmin && mode === "edit"}>
              <SelectTrigger>
                <SelectValue placeholder="Select an owner" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name ?? m.email}
                    {m.role ? ` · ${m.role}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Category" id="category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_CATEGORY.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status" id="status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description" id="description" className="sm:col-span-2">
            <Textarea
              id="description"
              name="description"
              defaultValue={initial?.description ?? ""}
              maxLength={2000}
              placeholder="Scope, deliverables, anything important."
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Money & timeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <Field label="Price total" id="priceTotal" required>
            <Input
              id="priceTotal"
              name="priceTotal"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={String(initial?.priceTotal ?? 0)}
              disabled={!isAdmin && mode === "edit"}
            />
          </Field>
          <Field label="Currency" id="currency">
            <Input
              id="currency"
              name="currency"
              maxLength={3}
              defaultValue={initial?.currency ?? defaultCurrency}
              className="uppercase"
              disabled={!isAdmin && mode === "edit"}
            />
          </Field>
          <Field label="Progress" id="progressPct">
            <div className="flex items-center gap-3">
              <input
                id="progressPct"
                type="range"
                min={0}
                max={100}
                step={1}
                value={progressPct}
                onChange={(e) => setProgressPct(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              <span className="w-10 text-right text-sm font-semibold tabular-nums">{progressPct}%</span>
            </div>
          </Field>
          <Field label="Start date" id="startDate">
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={initial?.startDateISO ?? ""}
            />
          </Field>
          <Field label="Deadline" id="deadline">
            <Input
              id="deadline"
              name="deadline"
              type="date"
              defaultValue={initial?.deadlineISO ?? ""}
            />
          </Field>
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent>
            <MemberMultiselect options={members} value={memberIds} onChange={setMemberIds} />
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  required,
  className,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}
