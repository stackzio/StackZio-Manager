"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MemberMultiselect, type MemberOption } from "@/app/(app)/projects/_components/member-multiselect";
import { createMeetingAction, updateMeetingAction } from "@/server/meetings/actions";
import {
  MEETING_LOCATION,
  MEETING_STATUS,
  type UpsertMeetingInput,
} from "@/server/meetings/schemas";

interface ClientOption {
  id: string;
  name: string;
}
interface ProjectOption {
  id: string;
  name: string;
}

interface Props {
  mode: "create" | "edit";
  meetingId?: string;
  clients: ClientOption[];
  projects: ProjectOption[];
  members: MemberOption[];
  initial?: Partial<UpsertMeetingInput> & { scheduledAtLocal?: string };
}

const NONE = "__none__";

const LOCATION_LABEL: Record<string, string> = {
  ONLINE: "Online",
  CLIENT_LOCATION: "At client location",
  OUR_LOCATION: "At our location",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export function MeetingForm({ mode, meetingId, clients, projects, members, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [attendeeIds, setAttendeeIds] = useState<string[]>(initial?.attendeeIds ?? []);
  const [clientId, setClientId] = useState<string>(initial?.clientId ?? NONE);
  const [projectId, setProjectId] = useState<string>(initial?.projectId ?? NONE);
  const [locationKind, setLocationKind] = useState<string>(initial?.locationKind ?? "ONLINE");
  const [status, setStatus] = useState<string>(initial?.status ?? "SCHEDULED");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input: UpsertMeetingInput = {
      title: String(fd.get("title") ?? "").trim(),
      clientId: clientId === NONE ? "" : clientId,
      projectId: projectId === NONE ? "" : projectId,
      scheduledAt: String(fd.get("scheduledAt") ?? ""),
      durationMin: Number(fd.get("durationMin") ?? 30),
      locationKind: locationKind as (typeof MEETING_LOCATION)[number],
      locationDetail: String(fd.get("locationDetail") ?? "").trim(),
      meetingUrl: String(fd.get("meetingUrl") ?? "").trim(),
      agenda: String(fd.get("agenda") ?? "").trim(),
      remarks: String(fd.get("remarks") ?? "").trim(),
      status: status as (typeof MEETING_STATUS)[number],
      attendeeIds,
    };
    start(async () => {
      const res =
        mode === "create"
          ? await createMeetingAction(input)
          : await updateMeetingAction(meetingId!, input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "create" ? "Meeting scheduled" : "Meeting updated");
      router.push(`/meetings/${res.meetingId}`);
      router.refresh();
    });
  }

  const projectsForClient = clientId === NONE ? projects : projects;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>What & when</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Title" id="title" required className="sm:col-span-2">
            <Input id="title" name="title" required maxLength={160} defaultValue={initial?.title ?? ""} placeholder="Kick-off, status review, …" />
          </Field>
          <Field label="Date & time" id="scheduledAt" required>
            <Input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              required
              defaultValue={initial?.scheduledAtLocal ?? ""}
            />
          </Field>
          <Field label="Duration (min)" id="durationMin">
            <Input
              id="durationMin"
              name="durationMin"
              type="number"
              min={5}
              max={600}
              step={5}
              defaultValue={String(initial?.durationMin ?? 30)}
            />
          </Field>
          <Field label="Status" id="status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEETING_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Location" id="locationKind">
            <Select value={locationKind} onValueChange={setLocationKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEETING_LOCATION.map((l) => (
                  <SelectItem key={l} value={l}>
                    {LOCATION_LABEL[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Meeting URL" id="meetingUrl">
            <Input
              id="meetingUrl"
              name="meetingUrl"
              type="url"
              defaultValue={initial?.meetingUrl ?? ""}
              placeholder="https://meet.…"
            />
          </Field>
          <Field label="Location detail" id="locationDetail" className="sm:col-span-2">
            <Input
              id="locationDetail"
              name="locationDetail"
              defaultValue={initial?.locationDetail ?? ""}
              placeholder="Address, room, or any notes about where to meet"
              maxLength={200}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked to</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Client" id="clientId">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Project" id="projectId">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {projectsForClient.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberMultiselect options={members} value={attendeeIds} onChange={setAttendeeIds} placeholder="Add team members" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agenda & remarks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Agenda" id="agenda">
            <Textarea
              id="agenda"
              name="agenda"
              defaultValue={initial?.agenda ?? ""}
              placeholder="What you want to cover."
              maxLength={2000}
              className="min-h-[120px]"
            />
          </Field>
          <Field label="Remarks" id="remarks">
            <Textarea
              id="remarks"
              name="remarks"
              defaultValue={initial?.remarks ?? ""}
              placeholder="Any extra context — outcomes, decisions, etc."
              maxLength={2000}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? "Saving…" : mode === "create" ? "Schedule meeting" : "Save changes"}
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
