import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { formatDate } from "@stackzio/lib/date";
import { formatMoney } from "@stackzio/lib/money";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { getReceiptData } from "@/server/payments/queries";
import { PrintButton } from "../../_components/print-button";

export const metadata: Metadata = { title: "Payment receipt" };

const KIND_LABEL: Record<string, string> = {
  ADVANCE: "Advance",
  MILESTONE: "Milestone",
  FINAL: "Final payment",
};

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK: "Bank transfer",
  CARD: "Card",
  OTHER: "Other",
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const { id, paymentId } = await params;
  const data = await getReceiptData(id, paymentId);
  if (!data) notFound();

  const { payment, paidTotal, priceTotal, outstanding } = data;
  const cur = payment.project.currency as never;
  const org = payment.project.organization;
  const client = payment.project.client;
  const orgAddress = [org.addressLine1, org.addressLine2, org.city, org.state, org.country, org.postalCode]
    .filter(Boolean)
    .join(", ");
  const clientAddress = [client.addressLine1, client.addressLine2, client.city, client.state, client.country, client.postalCode]
    .filter(Boolean)
    .join(", ");
  const receiptNo = `R-${payment.id.slice(-8).toUpperCase()}`;

  return (
    <div className="mx-auto max-w-3xl print:max-w-full">
      {/* Toolbar — hidden on print */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button asChild variant="outline">
          <Link href={`/projects/${id}`}>
            <ArrowLeft className="size-4" /> Back to project
          </Link>
        </Button>
        <PrintButton />
      </div>

      <article className="receipt overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm print:rounded-none print:border-0 print:shadow-none">
        {/* Header */}
        <header className="relative bg-brand-gradient p-8 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl"
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
              <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Receipt</p>
              <p className="text-2xl font-semibold tabular-nums">{receiptNo}</p>
              <p className="mt-1 text-xs text-white/85">{formatDate(payment.paidAt, "dd MMM yyyy")}</p>
            </div>
          </div>
        </header>

        {/* Parties + meta */}
        <section className="grid gap-6 border-b p-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Billed to
            </p>
            <p className="mt-1 text-base font-semibold">{client.name}</p>
            {client.company ? (
              <p className="text-sm text-muted-foreground">{client.company}</p>
            ) : null}
            {client.email ? (
              <p className="text-sm text-muted-foreground">{client.email}</p>
            ) : null}
            {client.phone ? (
              <p className="text-sm text-muted-foreground">{client.phone}</p>
            ) : null}
            {clientAddress ? (
              <p className="mt-1 text-xs text-muted-foreground">{clientAddress}</p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              For project
            </p>
            <p className="mt-1 text-base font-semibold">{payment.project.name}</p>
            {payment.project.description ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {payment.project.description}
              </p>
            ) : null}
            {orgAddress ? (
              <p className="mt-2 text-xs text-muted-foreground">{orgAddress}</p>
            ) : null}
          </div>
        </section>

        {/* Line item */}
        <section className="border-b p-8">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 text-left">Description</th>
                <th className="pb-3 text-right">Method</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 align-top">
                  <p className="font-medium">{KIND_LABEL[payment.kind] ?? payment.kind}</p>
                  <p className="text-xs text-muted-foreground">
                    Paid on {formatDate(payment.paidAt, "dd MMM yyyy")}
                  </p>
                  {payment.reference ? (
                    <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
                  ) : null}
                  {payment.note ? (
                    <p className="mt-1 text-xs italic text-muted-foreground">"{payment.note}"</p>
                  ) : null}
                </td>
                <td className="py-4 text-right align-top">
                  <Badge variant="outline">{METHOD_LABEL[payment.method] ?? payment.method}</Badge>
                </td>
                <td className="py-4 text-right align-top text-base font-semibold tabular-nums">
                  {formatMoney(Number(payment.amount), cur)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Summary */}
        <section className="grid gap-2 p-8 sm:grid-cols-2">
          <div className="text-xs text-muted-foreground sm:max-w-xs">
            <p className="flex items-center gap-1.5 font-semibold text-success">
              <CheckCircle2 className="size-3.5" /> Payment received
            </p>
            <p className="mt-1">
              Thank you. This receipt confirms the payment listed above. Keep it for your records.
            </p>
          </div>
          <div className="space-y-2 sm:ml-auto sm:min-w-[260px]">
            <Row label="Project total" value={formatMoney(priceTotal, cur)} />
            <Row label="Total received to date" value={formatMoney(paidTotal, cur)} highlight="success" />
            <Row
              label="Outstanding"
              value={formatMoney(outstanding, cur)}
              highlight={outstanding > 0 ? "warning" : "success"}
            />
            <div className="my-2 h-px bg-border" />
            <Row
              label="This receipt"
              value={formatMoney(Number(payment.amount), cur)}
              big
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-muted/30 px-8 py-5 text-center text-xs text-muted-foreground">
          {org.contactPhone ? <span>{org.contactPhone} · </span> : null}
          {org.website ? <span>{org.website} · </span> : null}
          {org.contactEmail ? <span>{org.contactEmail}</span> : null}
        </footer>
      </article>

      {/* Print rules */}
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

function Row({
  label,
  value,
  big,
  highlight,
}: {
  label: string;
  value: string;
  big?: boolean;
  highlight?: "success" | "warning";
}) {
  const tone =
    highlight === "success"
      ? "text-success"
      : highlight === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${big ? "text-lg font-semibold" : "text-sm font-medium"} ${tone}`}>
        {value}
      </span>
    </div>
  );
}
