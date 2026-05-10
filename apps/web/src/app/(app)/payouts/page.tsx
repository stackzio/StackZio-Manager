import type { Metadata } from "next";
import { prisma } from "@stackzio/db";
import { requirePageOrgFinance } from "@/server/auth/guards";
import {
  addMonthsUTC,
  listPayouts,
  startOfMonthUTC,
} from "@/server/finance/queries";
import { PageHeader } from "@/components/page-header";
import { PayoutsToolbar } from "./_components/payouts-toolbar";
import {
  PayoutsTable,
  type PayoutRow,
} from "./_components/payouts-table";
import type { PayoutKind } from "./_components/payout-form";

export const metadata: Metadata = { title: "Payouts" };

const KIND_VALUES = ["SALARY", "PROJECT", "BONUS"] as const;

function toISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toISOMonth(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseDateBoundary(v: string | undefined, end: boolean): Date | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  return new Date(`${v}T${end ? "23:59:59" : "00:00:00"}Z`);
}

function parseKinds(csv: string | undefined): PayoutKind[] | undefined {
  if (!csv) return undefined;
  const parts = csv.split(",").filter(Boolean) as PayoutKind[];
  const filtered = parts.filter((p): p is PayoutKind =>
    (KIND_VALUES as readonly string[]).includes(p),
  );
  return filtered.length ? filtered : undefined;
}

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePageOrgFinance();
  const sp = await searchParams;

  const fromStr = typeof sp.from === "string" ? sp.from : undefined;
  const toStr = typeof sp.to === "string" ? sp.to : undefined;
  const membersStr = typeof sp.members === "string" ? sp.members : undefined;
  const kindsStr = typeof sp.kinds === "string" ? sp.kinds : undefined;
  const projectId =
    typeof sp.projectId === "string" && sp.projectId ? sp.projectId : undefined;

  const from = parseDateBoundary(fromStr, false);
  const to = parseDateBoundary(toStr, true);
  const memberUserIds = membersStr?.split(",").filter(Boolean);
  const kinds = parseKinds(kindsStr);

  const lastMonthStart = startOfMonthUTC(addMonthsUTC(new Date(), -1));
  const thisMonthStart = startOfMonthUTC(new Date());

  const [rawRows, projects, members, lastSalaries] = await Promise.all([
    listPayouts({
      from,
      to,
      memberUserIds,
      kinds,
      projectId,
      take: 100,
    }),
    prisma.project.findMany({
      where: {
        organizationId: ctx.org.id,
        status: { in: ["IN_PROGRESS", "ON_HOLD", "COMPLETED"] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: ctx.org.id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.payout.findMany({
      where: {
        organizationId: ctx.org.id,
        kind: "SALARY",
        periodMonth: { gte: lastMonthStart, lt: thisMonthStart },
      },
      include: {
        member: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  const rows: PayoutRow[] = rawRows.map((r) => ({
    id: r.id,
    memberUserId: r.memberUserId,
    memberName: r.member.name,
    memberEmail: r.member.email,
    memberImage: r.member.image,
    kind: r.kind,
    projectId: r.projectId,
    projectName: r.project?.name ?? null,
    amount: r.amount.toFixed(2),
    amountNumber: Number(r.amount),
    currency: r.currency,
    paidAt: r.paidAt,
    paidAtISO: toISODate(r.paidAt),
    periodMonthISO: r.periodMonth ? toISOMonth(r.periodMonth) : null,
    method: r.method,
    reference: r.reference,
    note: r.note,
  }));

  const memberOptions = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
  }));

  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  const lastSalaryRows = lastSalaries.map((s) => ({
    memberUserId: s.memberUserId,
    memberName: s.member.name,
    memberEmail: s.member.email,
    memberImage: s.member.image,
    amount: s.amount.toFixed(2),
  }));

  const isFiltered = !!(
    from ||
    to ||
    memberUserIds?.length ||
    kinds?.length ||
    projectId
  );

  const thisMonthISO = toISOMonth(thisMonthStart);
  const lastMonthISO = toISOMonth(lastMonthStart);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payouts"
        description="Salaries, project payouts, and bonuses paid out to your team."
      />
      <PayoutsToolbar
        members={memberOptions}
        projects={projectOptions}
        lastSalaries={lastSalaryRows}
        thisMonthISO={thisMonthISO}
        lastMonthISO={lastMonthISO}
      />
      <PayoutsTable
        rows={rows}
        members={memberOptions}
        projects={projectOptions}
        currency={ctx.org.defaultCurrency}
        isFiltered={isFiltered}
      />
    </div>
  );
}
