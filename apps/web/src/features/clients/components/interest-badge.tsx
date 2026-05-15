import { Badge } from "@/components/ui/badge";
import { ClientInterest } from "@stackzio/db";
import { INTEREST_BADGE, INTEREST_LABELS } from "../constants";

export function InterestBadge({ status }: { status: ClientInterest }) {
  return <Badge variant={INTEREST_BADGE[status]}>{INTEREST_LABELS[status]}</Badge>;
}
