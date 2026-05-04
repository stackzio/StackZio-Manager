import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { listMeetings } from "@/server/meetings/queries";
import { MeetingList } from "./_components/meeting-list";
import { MeetingsToolbar } from "./_components/meetings-toolbar";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const range = typeof sp.range === "string" ? sp.range : "upcoming";
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const now = new Date();

  let from: Date | undefined;
  let to: Date | undefined;
  if (range === "upcoming") from = now;
  else if (range === "past") to = now;

  const result = await listMeetings({ from, to, status });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Meetings"
        description="Schedule, track, and remember every conversation."
        actions={
          <Button asChild variant="gradient">
            <Link href="/meetings/new">
              <Plus className="size-4" /> New meeting
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MeetingsToolbar />
        <p className="text-xs text-muted-foreground">
          {result.total} meeting{result.total === 1 ? "" : "s"}
        </p>
      </div>
      {result.items.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="size-5" />}
          title={
            range === "upcoming"
              ? "No upcoming meetings"
              : range === "past"
                ? "No past meetings"
                : "No meetings yet"
          }
          description="Schedule one to keep everyone aligned."
          action={
            <Button asChild variant="gradient">
              <Link href="/meetings/new">
                <Plus className="size-4" /> New meeting
              </Link>
            </Button>
          }
        />
      ) : (
        <MeetingList meetings={result.items} />
      )}
    </div>
  );
}
