"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = [
  { value: "LEAD", label: "Lead" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];
const CATEGORIES = [
  { value: "SHOPIFY", label: "Shopify" },
  { value: "WEBSITE", label: "Website" },
  { value: "SOFTWARE", label: "Software" },
  { value: "MOBILE_APP", label: "Mobile app" },
  { value: "BRANDING", label: "Branding" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OTHER", label: "Other" },
];

const ALL = "__all__";

export function ProjectsToolbar() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function update(key: string, value: string | undefined) {
    const sp = new URLSearchParams(params.toString());
    if (value && value !== ALL) sp.set(key, value);
    else sp.delete(key);
    sp.delete("page");
    start(() => router.replace("?" + sp.toString()));
  }

  const q = params.get("q") ?? "";
  const status = params.get("status") ?? ALL;
  const category = params.get("category") ?? ALL;

  const hasFilter = q || status !== ALL || category !== ALL;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={q}
          placeholder="Search projects…"
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
          className="pl-9"
          data-pending={pending}
        />
      </div>

      <Select value={status} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={category} onValueChange={(v) => update("category", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilter ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            start(() => router.replace("?"));
          }}
        >
          <X className="size-3.5" /> Clear
        </Button>
      ) : (
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
          <Filter className="size-3" /> Filters
        </span>
      )}
    </div>
  );
}
