import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, IndianRupee, Wallet } from "lucide-react";
import { formatDate } from "@stackzio/lib/date";
import { formatMoney, paidPct } from "@stackzio/lib/money";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LogoMark } from "@/components/brand/logo";
import { getStatementData } from "@/server/payments/queries";
import { PrintButton } from "../payments/_components/print-button";

export const metadata: Metadata = { title: "Payment statement" };

const KIND_LABEL: Record<string, string> = {
  ADVANCE: "Advance",
  MILESTONE: "Milestone",
  FINAL: "Final",
};
const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK: "Bank",
  CARD: "Card",
  OTHER: "Other",
};

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getStatementData(id);
  if (!data) notFound();

  const { project, paidTotal, priceTotal, outstanding } = data;
  const cur = project.currency as never;
  const org = project.organization;
  const client = project.client;
  const pct = paidPct(priceTotal, paidTotal);
  const stmtNo = `S-${project.id.slice(-8).toUpperCase()}`;

  return (
    <div className="mx-auto max-w-4xl print:max-w-full">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button asChild variant="outline">
          <Link href={`/projects/${id}`}>
            <ArrowLeft className="size-4" /> Back to project
          </Link>
        </Button>
        <PrintButton />
      </div>

      <article className="receipt overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <header className="relative bg-brand-gradient p-8 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {org.logoUrl ? (
                <Avatar className="size-12 rounded-2xl bg-white/15">
                  <AvatarImage src={org.logoUrl} alt={org.name} />
                  <AvatarFallback className="rounded-2xl bg-white/20 text-white">
                    {org.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="rounded-2xl bg-white/15 p-2">
                  <LogoMark size={28} />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/80">From</p>
                <p className="text-lg font-semibold leading-tight">{org.name}</p>
                {org.contactEmail ? (
                  <p className="text-xs text-white/85">{org.contactEmail}</p>
                ) : null}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Statement</p>
              <p className="text-2xl font-semibold tabular-nums">{stmtNo}</p>
              <p className="mt-1 text-xs text-white/85">{formatDate(new Date(), "dd MMM yyyy")}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 border-b p-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Billed to</p>
            <p className="mt-1 text-base font-semibold">{client.name}</p>
            {client.company ? <p className="text-sm text-muted-foreground">{client.company}</p> : null}
            {client.email ? <p className="text-sm text-muted-foreground">{client.email}</p> : null}
            {client.phone ? <p className="text-sm text-muted-foreground">{client.phone}</p> : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Project</p>
            <p className="mt-1 text-base font-semibold">{project.name}</p>
            <Badge variant="secondary" className="mt-1">{project.status}</Badge>
          </div>
        </section>

        <section className="grid gap-3 border-b p-8 sm:grid-cols-3">
          <Stat
            icon={<IndianRupee className="size-4" />}
            label="Project total"
            value={formatMoney(priceTotal, cur)}
          />
          <Stat
            icon={<Wallet className="size-4" />}
            label="Received"
            value={formatMoney(paidTotal, cur)}
            tone="success"
          />
          <Stat
            icon={<Wallet className="size-4" />}
            label="Outstanding"
            value={formatMoney(outstanding, cur)}
            tone={outstanding > 0 ? "warning" : "success"}
          />
          <div className="sm:col-span-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Collected</span>
              <span className="font-semibold tabular-nums">{pct}%</span>
            </div>
            <Progress value={pct} className="mt-1.5" />
          </div>
        </section>

        <section className="p-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Payments ({project.payments.length})
          </p>
          {project.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 text-left">Date</th>
                  <th className="pb-2 text-left">Kind</th>
                  <th className="pb-2 text-left">Method</th>
                  <th className="pb-2 text-left">Reference</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {project.payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="py-3 text-sm">{formatDate(p.paidAt)}</td>
                    <td className="py-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {KIND_LABEL[p.kind] ?? p.kind}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {METHOD_LABEL[p.method] ?? p.method}
                      </Badge>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">{p.reference ?? "—"}</td>
                    <td className="py-3 text-right text-sm font-semibold tabular-nums">
                      {formatMoney(Number(p.amount), cur)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total received
                  </td>
                  <td className="py-3 text-right text-base font-bold tabular-nums">
                    {formatMoney(paidTotal, cur)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Outstanding
                  </td>
                  <td className={`py-3 text-right text-base font-bold tabular-nums ${outstanding > 0 ? "text-warning" : "text-success"}`}>
                    {formatMoney(outstanding, cur)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        <footer className="border-t bg-muted/30 px-8 py-5 text-center text-xs text-muted-foreground">
          <FileSpreadsheet className="mr-1 inline size-3" />
          Generated on {formatDate(new Date(), "dd MMM yyyy")} · {org.name}
        </footer>
      </article>

      <style>{`
        @media print {
          html, body { background: white !important; }
          body * { visibility: hidden; }
          .receipt, .receipt * { visibility: visible; }
          .receipt { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  const colour =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className={`mt-1 text-base font-semibold tabular-nums ${colour}`}>{value}</p>
    </div>
  );
}
