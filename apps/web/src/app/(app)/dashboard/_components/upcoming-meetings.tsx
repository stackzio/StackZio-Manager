import Link from "next/link";
import { CalendarClock, MapPin, Video } from "lucide-react";
import { formatDate } from "@stackzio/lib/date";

interface Meeting {
  id: string;
  title: string;
  scheduledAt: Date;
  locationKind: "ONLINE" | "CLIENT_LOCATION" | "OUR_LOCATION";
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
}

export function UpcomingMeetings({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Nothing scheduled in the next 7 days.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {meetings.map((m) => (
        <li key={m.id}>
          <Link
            href={`/meetings/${m.id}`}
            className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {formatDate(m.scheduledAt, "MMM")}
              </p>
              <p className="text-base font-semibold tabular-nums leading-none">
                {formatDate(m.scheduledAt, "dd")}
              </p>
              <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                {formatDate(m.scheduledAt, "h:mm a")}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.client?.name ?? m.project?.name ?? "—"}
              </p>
            </div>
            {m.locationKind === "ONLINE" ? (
              <Video className="size-4 text-muted-foreground" />
            ) : (
              <MapPin className="size-4 text-muted-foreground" />
            )}
            <CalendarClock className="hidden" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
