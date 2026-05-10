import { Receipt, Users } from "lucide-react";
import { Prisma } from "@stackzio/db";
import { formatMoney } from "@stackzio/lib/money";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

interface VendorRow {
  vendor: string | null;
  total: Prisma.Decimal;
}
interface EarnerRow {
  memberUserId: string;
  name: string | null;
  image: string | null;
  total: Prisma.Decimal;
}

interface Props {
  byVendor: VendorRow[];
  byEarner: EarnerRow[];
  currency: string;
}

export function TopTables({ byVendor, byEarner, currency }: Props) {
  const cur = currency as never;
  const vendorMax = max(byVendor.map((v) => toNum(v.total)));
  const earnerMax = max(byEarner.map((e) => toNum(e.total)));

  return (
    <FadeIn delay={0.1}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" aria-hidden /> Top vendors by spend
            </CardTitle>
            <CardDescription>Where the money is going.</CardDescription>
          </CardHeader>
          <CardContent>
            {byVendor.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No vendor spend this period.
              </p>
            ) : (
              <ul className="space-y-3">
                {byVendor.map((v, i) => {
                  const amount = toNum(v.total);
                  const width = vendorMax > 0 ? (amount / vendorMax) * 100 : 0;
                  return (
                    <li
                      key={`${v.vendor ?? "unknown"}-${i}`}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium">
                          {v.vendor && v.vendor.trim().length > 0 ? v.vendor : "—"}
                        </p>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatMoney(amount, cur)}
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500"
                          style={{ width: `${width}%` }}
                          aria-hidden
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" aria-hidden /> Top earners
            </CardTitle>
            <CardDescription>Team members paid most this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {byEarner.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No payouts this period.
              </p>
            ) : (
              <ul className="space-y-3">
                {byEarner.map((e) => {
                  const amount = toNum(e.total);
                  const width = earnerMax > 0 ? (amount / earnerMax) * 100 : 0;
                  const name = e.name ?? "Unnamed";
                  return (
                    <li key={e.memberUserId} className="rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {e.image ? <AvatarImage src={e.image} alt={name} /> : null}
                          <AvatarFallback>{initials(name)}</AvatarFallback>
                        </Avatar>
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                          {name}
                        </p>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatMoney(amount, cur)}
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                          style={{ width: `${width}%` }}
                          aria-hidden
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}

function toNum(d: Prisma.Decimal): number {
  return Number(d.toFixed(2));
}

function max(values: number[]): number {
  let m = 0;
  for (const v of values) if (v > m) m = v;
  return m;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}
