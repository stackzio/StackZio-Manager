"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";
const STATUSES = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "DONE", label: "Done" },
  { value: "CANCELLED", label: "Cancelled" },
];
const RANGES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All time" },
];

export function MeetingsToolbar() {
  const router = useRouter();
  const params = useSearchParams();
  const [, start] = useTransition();

  function update(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value && value !== ALL) sp.set(key, value);
    else sp.delete(key);
    sp.delete("page");
    start(() => router.replace("?" + sp.toString()));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={params.get("range") ?? "upcoming"} onValueChange={(v) => update("range", v)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGES.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={params.get("status") ?? ALL} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any status</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
