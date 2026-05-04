"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteMeetingAction, setMeetingStatusAction } from "@/server/meetings/actions";

export function MeetingActions({
  meetingId,
  status,
  canDelete,
}: {
  meetingId: string;
  status: "SCHEDULED" | "DONE" | "CANCELLED";
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function setStatus(next: "SCHEDULED" | "DONE" | "CANCELLED") {
    start(async () => {
      const res = await setMeetingStatusAction(meetingId, next);
      if (!res.ok) {
        toast.error(res.error ?? "Could not update");
        return;
      }
      toast.success("Updated");
      router.refresh();
    });
  }

  function onDelete() {
    start(async () => {
      const res = await deleteMeetingAction(meetingId);
      if (!res.ok) {
        toast.error(res.error ?? "Could not delete");
        return;
      }
      toast.success("Meeting deleted");
      setOpen(false);
      router.push("/meetings");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      {status !== "DONE" ? (
        <Button variant="outline" size="sm" onClick={() => setStatus("DONE")} disabled={pending}>
          <Check className="size-4 text-success" /> Mark done
        </Button>
      ) : null}
      {status !== "CANCELLED" && status !== "DONE" ? (
        <Button variant="outline" size="sm" onClick={() => setStatus("CANCELLED")} disabled={pending}>
          <X className="size-4 text-destructive" /> Cancel
        </Button>
      ) : null}
      {canDelete ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Delete">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this meeting?</DialogTitle>
              <DialogDescription>This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={onDelete} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
