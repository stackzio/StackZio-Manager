"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClientFollowUpAction } from "@/server/clients/sales.actions";

interface Props {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string | null;
  initialReason?: string | null;
}

function toInputValue(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function FollowUpDialog({ clientId, open, onOpenChange, initialDate, initialReason }: Props) {
  const [date, setDate] = useState(toInputValue(initialDate));
  const [reason, setReason] = useState(initialReason ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      toast.error("Pick a date");
      return;
    }
    startTransition(async () => {
      const res = await updateClientFollowUpAction({
        clientId,
        followUpAt: new Date(date),
        followUpReason: reason.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Follow-up scheduled");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" /> Schedule follow-up
          </DialogTitle>
          <DialogDescription>When should we reach out next?</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="followUpAt">Date &amp; time</Label>
            <Input
              id="followUpAt"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="followUpReason">Reason (optional)</Label>
            <Input
              id="followUpReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. send proposal, check budget"
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
