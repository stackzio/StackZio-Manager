import {
  Activity,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  FolderKanban,
  ListChecks,
  UserPlus,
  Users,
} from "lucide-react";
import { timeAgo } from "@stackzio/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Item {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  metadata: unknown;
  createdAt: Date;
  actor: { id: string; name: string | null; email: string; image: string | null };
}

const ICON_BY_ENTITY: Record<string, React.ComponentType<{ className?: string }>> = {
  organization: Building2,
  client: Users,
  project: FolderKanban,
  payment: CreditCard,
  task: ListChecks,
  meeting: CalendarClock,
  team: UserPlus,
  user: Users,
};

function describe(item: Item): string {
  const entity = item.entity;
  const a = item.action;
  const meta = (item.metadata ?? {}) as Record<string, unknown>;
  const name = (meta.name as string) ?? (meta.title as string) ?? "";

  switch (`${entity}:${a}`) {
    case "client:created": return `created client ${name}`.trim();
    case "client:updated": return `updated client ${name}`.trim();
    case "client:deleted": return `deleted client ${name}`.trim();
    case "project:created": return `created project ${name}`.trim();
    case "project:updated": return `updated project`;
    case "project:deleted": return `deleted project ${name}`.trim();
    case "project:doc_uploaded": return `uploaded a doc`;
    case "project:doc_linked": return `added a doc link`;
    case "project:doc_deleted": return `removed a doc`;
    case "payment:created": return `recorded a payment`;
    case "payment:deleted": return `deleted a payment`;
    case "task:created": return `added a task`;
    case "task:status_done": return `completed a task`;
    case "task:status_doing": return `started a task`;
    case "task:status_todo": return `reopened a task`;
    case "task:deleted": return `deleted a task`;
    case "meeting:created": return `scheduled a meeting`;
    case "meeting:updated": return `updated a meeting`;
    case "meeting:deleted": return `deleted a meeting`;
    case "meeting:status_done": return `marked a meeting done`;
    case "meeting:status_cancelled": return `cancelled a meeting`;
    case "team:invited": return `invited a teammate`;
    case "team:invite_revoked": return `revoked an invite`;
    case "team:role_changed": return `changed a member role`;
    case "team:removed": return `removed a member`;
    case "team:left": return `left the organization`;
    case "team:joined": return `joined the organization`;
    case "organization:created": return `created the organization`;
    case "organization:updated": return `updated the organization`;
    case "organization:logo_updated": return `updated the org logo`;
    default: return `${a} on ${entity}`;
  }
}

export function ActivityFeed({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No activity yet.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const Icon = ICON_BY_ENTITY[it.entity] ?? Activity;
        const initials = (it.actor.name ?? it.actor.email)
          .split(/[\s.@]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase())
          .join("");
        const success = /done|created|joined/.test(it.action);
        return (
          <li key={it.id} className="flex items-start gap-3 text-sm">
            <Avatar className="size-7 shrink-0">
              {it.actor.image ? <AvatarImage src={it.actor.image} alt="" /> : null}
              <AvatarFallback className="text-[10px]">{initials || "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="leading-snug">
                <span className="font-medium">{it.actor.name ?? it.actor.email}</span>{" "}
                <span className="text-muted-foreground">{describe(it)}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(it.createdAt)}</p>
            </div>
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              {success ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />}
            </span>
            <FileText className="hidden" />
          </li>
        );
      })}
    </ul>
  );
}
