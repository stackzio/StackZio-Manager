"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { ClientNoteKind } from "@stackzio/db";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addClientNoteAction } from "@/server/clients/notes.actions";
import { NOTE_KIND_LABELS, NOTE_KIND_ORDER } from "../constants";

export function DiscussionComposer({ clientId }: { clientId: string }) {
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<ClientNoteKind>("NOTE");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await addClientNoteAction({ clientId, body: trimmed, kind });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setBody("");
      setKind("NOTE");
      toast.success("Note added");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-lg border bg-card p-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did the client say? Log a call, email, meeting, or general note…"
        maxLength={4000}
        className="min-h-[80px] resize-none"
        aria-label="Discussion note"
      />
      <div className="flex items-center justify-between gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as ClientNoteKind)} disabled={pending}>
          <SelectTrigger className="h-8 w-36 text-xs" aria-label="Note kind">
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
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          Add note
        </Button>
      </div>
    </form>
  );
}
