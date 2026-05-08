"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Briefcase,
  CalendarRange,
  CircleDollarSign,
  Code2,
  Globe,
  Layers,
  Loader2,
  Megaphone,
  Palette,
  Save,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { createProjectAction, updateProjectAction } from "@/server/projects/actions";
import {
  PROJECT_CATEGORY,
  PROJECT_STATUS,
  type UpsertProjectInput,
} from "@/server/projects/schemas";
import { MemberMultiselect, type MemberOption } from "./member-multiselect";
import { cn } from "@/lib/cn";

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

const CATEGORY_OPTIONS: Array<{
  value: (typeof PROJECT_CATEGORY)[number];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  iconColor: string;
}> = [
  { value: "SHOPIFY", label: "Shopify", icon: ShoppingBag, hint: "Online store, theme, app", iconColor: "text-emerald-500" },
  { value: "WEBSITE", label: "Website", icon: Globe, hint: "Marketing or content site", iconColor: "text-blue-500" },
  { value: "SOFTWARE", label: "Software", icon: Code2, hint: "Web app, internal tool, API", iconColor: "text-violet-500" },
  { value: "MOBILE_APP", label: "Mobile app", icon: Smartphone, hint: "iOS / Android / cross-platform", iconColor: "text-fuchsia-500" },
  { value: "BRANDING", label: "Branding", icon: Palette, hint: "Logo, identity, design system", iconColor: "text-rose-500" },
  { value: "MARKETING", label: "Marketing", icon: Megaphone, hint: "Campaigns, ads, content", iconColor: "text-amber-500" },
  { value: "OTHER", label: "Other", icon: Sparkles, hint: "Doesn't fit the above", iconColor: "text-zinc-500" },
];

const STATUS_OPTIONS: Array<{ value: (typeof PROJECT_STATUS)[number]; label: string; tone: string }> = [
  { value: "LEAD", label: "Lead", tone: "border-zinc-500/30 text-zinc-500 bg-zinc-500/5" },
  { value: "IN_PROGRESS", label: "In progress", tone: "border-primary/40 text-primary bg-primary/5" },
  { value: "ON_HOLD", label: "On hold", tone: "border-warning/40 text-warning bg-warning/5" },
  { value: "COMPLETED", label: "Completed", tone: "border-success/40 text-success bg-success/5" },
  { value: "CANCELLED", label: "Cancelled", tone: "border-destructive/40 text-destructive bg-destructive/5" },
];

export function ProjectForm({ mode, projectId, clients, members, initial, defaultCurrency, isAdmin }: Props) {
  // Members get a tight, focused edit form: status, description, progress,
  // dates only. No client, no owner, no money, no team — never rendered, so
  // the values can't be inspected via DevTools either.
  if (!isAdmin && mode === "edit") {
    return (
      <MemberProjectEditForm
        projectId={projectId!}
        initial={initial!}
        currentStatus={(initial?.status as (typeof PROJECT_STATUS)[number]) ?? "IN_PROGRESS"}
        clientId={(initial?.clientId as string) ?? ""}
        ownerId={(initial?.ownerId as string) ?? ""}
        category={(initial?.category as (typeof PROJECT_CATEGORY)[number]) ?? "OTHER"}
        memberIds={(initial?.memberIds as string[] | undefined) ?? []}
        priceTotal={Number(initial?.priceTotal ?? 0)}
        currency={(initial?.currency as string) ?? defaultCurrency}
      />
    );
  }
  return (
    <AdminProjectForm
      mode={mode}
      projectId={projectId}
      clients={clients}
      members={members}
      initial={initial}
      defaultCurrency={defaultCurrency}
    />
  );
}

function AdminProjectForm({
  mode,
  projectId,
  clients,
  members,
  initial,
  defaultCurrency,
}: Omit<Props, "isAdmin">) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [memberIds, setMemberIds] = useState<string[]>(initial?.memberIds ?? []);
  const [category, setCategory] = useState<(typeof PROJECT_CATEGORY)[number]>(
    (initial?.category as (typeof PROJECT_CATEGORY)[number]) ?? "WEBSITE",
  );
  const [status, setStatus] = useState<(typeof PROJECT_STATUS)[number]>(
    (initial?.status as (typeof PROJECT_STATUS)[number]) ?? "LEAD",
  );
  const [clientId, setClientId] = useState<string>(initial?.clientId ?? "");
  const [ownerId, setOwnerId] = useState<string>(initial?.ownerId ?? "");
  const [progressPct, setProgressPct] = useState<number>(Number(initial?.progressPct ?? 0));
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [currency, setCurrency] = useState<string>((initial?.currency as string) ?? defaultCurrency);
  const [priceTotal, setPriceTotal] = useState<string>(String(initial?.priceTotal ?? ""));
  const isAdmin = true;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input: UpsertProjectInput = {
      name: name.trim(),
      description: String(fd.get("description") ?? "").trim(),
      clientId,
      ownerId,
      category,
      status,
      priceTotal: Number(priceTotal || 0),
      currency: currency.trim().toUpperCase(),
      startDate: String(fd.get("startDate") ?? ""),
      deadline: String(fd.get("deadline") ?? ""),
      progressPct,
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

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ---------- Hero / preview ---------- */}
      <Card className="overflow-hidden border-0 bg-brand-gradient text-white shadow-lg">
        <CardContent className="relative p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
              <Briefcase className="size-3.5" />
              {mode === "create" ? "New project" : "Editing project"}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Name your project"
              maxLength={160}
              className="mt-2 w-full bg-transparent text-3xl font-semibold tracking-tight text-white placeholder:text-white/60 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/85">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                <Tag className="size-3" />
                {CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                {STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status}
              </span>
              {selectedClient ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                  for {selectedClient.name}
                </span>
              ) : null}
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                  <CircleDollarSign className="size-3" />
                  {currency} {priceTotal || "0"}
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Basics ---------- */}
      <Section icon={<Layers className="size-4" />} title="Basics" subtitle="Who's it for, what category, and a short description.">
        <div className="grid gap-5 sm:grid-cols-2">
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
        </div>

        <div className="mt-5 space-y-2">
          <Label>Category</Label>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORY_OPTIONS.map((c) => {
              const Icon = c.icon;
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                    active && "border-primary bg-primary/5 ring-2 ring-primary/30",
                  )}
                >
                  <Icon className={cn("size-5 shrink-0", c.iconColor)} />
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-[11px] text-muted-foreground">{c.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all hover:border-primary/40",
                  status === s.value ? cn("border", s.tone) : "text-muted-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={initial?.description as string ?? ""}
            maxLength={2000}
            placeholder="Scope, deliverables, anything important."
            className="min-h-[110px]"
          />
        </div>
      </Section>

      {/* ---------- Money & timeline ---------- */}
      <Section icon={<CircleDollarSign className="size-4" />} title="Money & timeline" subtitle="Price, currency, and when it should land.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Price total" id="priceTotal" required>
            <Input
              id="priceTotal"
              name="priceTotal"
              type="number"
              step="0.01"
              min="0"
              required
              value={priceTotal}
              onChange={(e) => setPriceTotal(e.target.value)}
              placeholder="0.00"
              disabled={!isAdmin && mode === "edit"}
            />
          </Field>
          <Field label="Currency" id="currency">
            <Input
              id="currency"
              name="currency"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="uppercase"
              disabled={!isAdmin && mode === "edit"}
            />
          </Field>
          <Field label={`Progress · ${progressPct}%`} id="progressPct">
            <div className="space-y-2">
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
              <Progress value={progressPct} />
            </div>
          </Field>
          <Field label="Start date" id="startDate">
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={initial?.startDateISO ?? ""}
                className="pl-8"
              />
            </div>
          </Field>
          <Field label="Deadline" id="deadline">
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="deadline"
                name="deadline"
                type="date"
                defaultValue={initial?.deadlineISO ?? ""}
                className="pl-8"
              />
            </div>
          </Field>
        </div>
      </Section>

      {/* ---------- Team ---------- */}
      {isAdmin ? (
        <Section icon={<Users className="size-4" />} title="Team" subtitle="Who's working on this — they'll see only the projects they're assigned to.">
          <MemberMultiselect options={members} value={memberIds} onChange={setMemberIds} />
        </Section>
      ) : null}

      <div className="sticky bottom-4 z-10 flex justify-end gap-2 rounded-xl border bg-background/80 p-3 shadow-md backdrop-blur">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient" size="lg" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
          <div>
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
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

// Compact edit form for non-admin team members. Server action gates which
// fields actually persist (only status, description, progress, dates,
// category). Client / owner / price / currency / members are passed
// through unchanged from the loaded values — never rendered to the DOM.
function MemberProjectEditForm({
  projectId,
  initial,
  currentStatus,
  clientId,
  ownerId,
  category,
  memberIds,
  priceTotal,
  currency,
}: {
  projectId: string;
  initial: NonNullable<Props["initial"]>;
  currentStatus: (typeof PROJECT_STATUS)[number];
  clientId: string;
  ownerId: string;
  category: (typeof PROJECT_CATEGORY)[number];
  memberIds: string[];
  priceTotal: number;
  currency: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<(typeof PROJECT_STATUS)[number]>(currentStatus);
  const [progressPct, setProgressPct] = useState<number>(Number(initial.progressPct ?? 0));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input: UpsertProjectInput = {
      name: (initial.name as string) ?? "",
      description: String(fd.get("description") ?? "").trim(),
      // pass-through values — server enforces what members may actually change
      clientId,
      ownerId,
      category,
      status,
      priceTotal,
      currency,
      startDate: String(fd.get("startDate") ?? ""),
      deadline: String(fd.get("deadline") ?? ""),
      progressPct,
      memberIds,
    };
    start(async () => {
      const res = await updateProjectAction(projectId, input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved");
      router.push(`/projects/${res.projectId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Layers className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold leading-tight">Update your work</h2>
              <p className="text-xs text-muted-foreground">
                You can change status, progress, dates and notes. Other fields are managed by an admin.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all hover:border-primary/40",
                      status === s.value ? cn("border", s.tone) : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label={`Progress · ${progressPct}%`} id="progressPct">
              <div className="space-y-2">
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
                <Progress value={progressPct} />
              </div>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Start date" id="startDate">
                <div className="relative">
                  <CalendarRange className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={initial.startDateISO ?? ""}
                    className="pl-8"
                  />
                </div>
              </Field>
              <Field label="Deadline" id="deadline">
                <div className="relative">
                  <CalendarRange className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="deadline"
                    name="deadline"
                    type="date"
                    defaultValue={initial.deadlineISO ?? ""}
                    className="pl-8"
                  />
                </div>
              </Field>
            </div>

            <Field label="Description / notes" id="description">
              <Textarea
                id="description"
                name="description"
                defaultValue={(initial.description as string) ?? ""}
                maxLength={2000}
                placeholder="What's happening on this project?"
                className="min-h-[110px]"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
