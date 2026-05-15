"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, timeAgo } from "@stackzio/lib/date";
import { markFollowUpDoneAction } from "@/server/clients/sales.actions";
import { FollowUpDialog } from "./follow-up-dialog";

interface Props {
  clientId: string;
  followUpAt: string | null;
  followUpReason: string | null;
}

export function FollowUpCard({ clientId, followUpAt, followUpReason }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDone() {
    startTransition(async () => {
      const res = await markFollowUpDoneAction(clientId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Follow-up marked done");
    });
  }

  const date = followUpAt ? new Date(followUpAt) : null;
  const overdue = date ? date.getTime() < Date.now() : false;

  return (
    <Card className={overdue ? "border-destructive/50" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarClock className="size-4" /> Follow-up
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {date ? (
          <>
            <div>
              <p className={overdue ? "font-semibold text-destructive" : "font-semibold"}>
                {formatDate(date, "EEE dd MMM yyyy, h:mm a")}
              </p>
              <p className="text-xs text-muted-foreground">
                {overdue ? `${timeAgo(date)} overdue` : timeAgo(date)}
              </p>
            </div>
            {followUpReason ? <p className="text-muted-foreground">{followUpReason}</p> : null}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={pending}>
                <Pencil className="size-3" /> Reschedule
              </Button>
              <Button size="sm" variant="outline" onClick={onDone} disabled={pending}>
                <Check className="size-3" /> Mark done
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">No follow-up scheduled.</p>
            <Button size="sm" onClick={() => setOpen(true)}>
              Schedule follow-up
            </Button>
          </>
        )}
      </CardContent>
      <FollowUpDialog
        clientId={clientId}
        open={open}
        onOpenChange={setOpen}
        initialDate={followUpAt}
        initialReason={followUpReason}
      />
    </Card>
  );
}
