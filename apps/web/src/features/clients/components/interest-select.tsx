"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ClientInterest } from "@stackzio/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateClientInterestAction } from "@/server/clients/sales.actions";
import { INTEREST_LABELS, INTEREST_ORDER } from "../constants";

interface Props {
  clientId: string;
  value: ClientInterest;
  disabled?: boolean;
}

export function InterestSelect({ clientId, value, disabled }: Props) {
  const [current, setCurrent] = useState<ClientInterest>(value);
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    const status = next as ClientInterest;
    const previous = current;
    setCurrent(status);
    startTransition(async () => {
      const res = await updateClientInterestAction({ clientId, interestStatus: status });
      if (!res.ok) {
        setCurrent(previous);
        toast.error(res.error);
      } else {
        toast.success("Status updated");
      }
    });
  }

  return (
    <Select value={current} onValueChange={onChange} disabled={disabled || pending}>
      <SelectTrigger className="h-8 w-44 text-xs" aria-label="Client interest status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {INTEREST_ORDER.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {INTEREST_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
