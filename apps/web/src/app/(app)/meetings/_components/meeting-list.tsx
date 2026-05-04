"use client";

import Link from "next/link";
import { CalendarClock, MapPin, Users, Video } from "lucide-react";
import { formatDate } from "@stackzio/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface Attendee {
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface Meeting {
  id: string;
  title: string;
  scheduledAt: Date;
  durationMin: number;
  locationKind: "ONLINE" | "CLIENT_LOCATION" | "OUR_LOCATION";
  locationDetail: string | null;
  meetingUrl: string | null;
  status: "SCHEDULED" | "DONE" | "CANCELLED";
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  attendees: Attendee[];
}

const LOCATION_ICON = {
  ONLINE: Video,
  CLIENT_LOCATION: MapPin,
  OUR_LOCATION: MapPin,
} as const;

const LOCATION_LABEL = {
  ONLINE: "Online",
  CLIENT_LOCATION: "Client location",
  OUR_LOCATION: "Our location",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  SCHEDULED: "default",
  DONE: "success",
  CANCELLED: "destructive",
};

export function MeetingList({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) {
    return null;
  }
  // Group by date string
  const groups = new Map<string, Meeting[]>();
  for (const m of meetings) {
    const key = formatDate(m.scheduledAt, "EEEE, dd MMM yyyy");
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([day, items]) => (
        <section key={day} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day}</h3>
          <ul className="space-y-2">
            {items.map((m) => {
              const Icon = LOCATION_ICON[m.locationKind];
              return (
                <li key={m.id}>
                  <Link href={`/meetings/${m.id}`} className="block">
                    <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="text-center">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {formatDate(m.scheduledAt, "MMM")}
                          </p>
                          <p className="text-lg font-semibold tabular-nums">
                            {formatDate(m.scheduledAt, "dd")}
                          </p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {formatDate(m.scheduledAt, "h:mm a")}
                          </p>
                        </div>
                        <div className="hidden h-10 w-px bg-border sm:block" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">{m.title}</p>
                            <Badge variant={STATUS_VARIANT[m.status] ?? "secondary"}>{m.status}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Icon className="size-3" />
                              {LOCATION_LABEL[m.locationKind]}
                              {m.locationDetail ? ` · ${m.locationDetail}` : ""}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="size-3" />
                              {m.durationMin} min
                            </span>
                            {m.client ? (
                              <span className="truncate">· Client: {m.client.name}</span>
                            ) : null}
                            {m.project ? (
                              <span className="truncate">· Project: {m.project.name}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="hidden items-center gap-1 sm:flex">
                          <Users className="size-3 text-muted-foreground" />
                          <div className="flex -space-x-2">
                            {m.attendees.slice(0, 4).map((a) => {
                              const initials = (a.user.name ?? a.user.email)
                                .split(/[\s.@]+/)
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((s) => s[0]?.toUpperCase())
                                .join("");
                              return (
                                <Avatar
                                  key={a.user.id}
                                  className={cn(
                                    "size-6 border-2 border-card",
                                  )}
                                >
                                  {a.user.image ? <AvatarImage src={a.user.image} alt="" /> : null}
                                  <AvatarFallback className="text-[10px]">{initials || "U"}</AvatarFallback>
                                </Avatar>
                              );
                            })}
                            {m.attendees.length > 4 ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                +{m.attendees.length - 4}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
