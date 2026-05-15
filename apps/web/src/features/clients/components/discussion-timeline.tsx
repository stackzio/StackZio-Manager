import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { DiscussionComposer } from "./discussion-composer";
import { DiscussionNoteItem, type DiscussionNote } from "./discussion-note-item";

interface Props {
  clientId: string;
  notes: DiscussionNote[];
  currentUserId: string;
  isAdmin: boolean;
}

export function DiscussionTimeline({ clientId, notes, currentUserId, isAdmin }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" /> Discussion ({notes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DiscussionComposer clientId={clientId} />
        {notes.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            No notes yet. Log calls, emails, or meetings here so the team has the full picture.
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <DiscussionNoteItem
                key={n.id}
                note={n}
                canModify={isAdmin || n.author.id === currentUserId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
