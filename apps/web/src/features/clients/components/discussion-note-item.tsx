"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ClientNoteKind } from "@stackzio/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@stackzio/lib/date";
import {
  deleteClientNoteAction,
  updateClientNoteAction,
} from "@/server/clients/notes.actions";
import { NOTE_KIND_ICONS, NOTE_KIND_LABELS, NOTE_KIND_ORDER } from "../constants";

export interface DiscussionNote {
  id: string;
  body: string;
  kind: ClientNoteKind;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string | null; image: string | null };
}

interface Props {
  note: DiscussionNote;
  canModify: boolean;
}

export function DiscussionNoteItem({ note, canModify }: Props) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [kind, setKind] = useState<ClientNoteKind>(note.kind);
  const [pending, startTransition] = useTransition();

  const Icon = NOTE_KIND_ICONS[note.kind];
  const initials = (note.author.name ?? "?").slice(0, 2).toUpperCase();
  const edited = new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 5000;

  function onSave() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await updateClientNoteAction({ id: note.id, body: trimmed, kind });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEditing(false);
      toast.success("Note updated");
    });
  }

  function onDelete() {
    if (!confirm("Delete this note?")) return;
    startTransition(async () => {
      const res = await deleteClientNoteAction({ id: note.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Note deleted");
    });
  }

  return (
    <div className="flex gap-3 rounded-lg border p-3">
      <Avatar className="size-8 shrink-0">
        {note.author.image ? <AvatarImage src={note.author.image} alt="" /> : null}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-foreground">{note.author.name ?? "Unknown"}</span>
          <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
            <Icon className="size-3" /> {NOTE_KIND_LABELS[note.kind]}
          </Badge>
          <span className="text-muted-foreground">· {timeAgo(note.createdAt)}</span>
          {edited ? <span className="text-muted-foreground">· edited</span> : null}
          {canModify && !editing ? (
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6" aria-label="Note actions">
                    <MoreHorizontal className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditing(true)}>
                    <Pencil className="size-3" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onDelete} className="text-destructive">
                    <Trash2 className="size-3" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={4000}
              className="min-h-[80px] resize-none"
            />
            <div className="flex items-center gap-2">
              <Select value={kind} onValueChange={(v) => setKind(v as ClientNoteKind)} disabled={pending}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_KIND_ORDER.map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {NOTE_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
              <Button size="sm" onClick={onSave} disabled={pending || !body.trim()}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
        )}
      </div>
    </div>
  );
}
