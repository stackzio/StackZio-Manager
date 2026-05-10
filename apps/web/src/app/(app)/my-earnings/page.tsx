import type { Metadata } from "next";
import { getActiveOrg, requireUser } from "@/server/auth/guards";
import { getMyEarnings } from "@/server/finance/queries";
import { EarningsHero } from "./_components/earnings-hero";
import { EarningsTabs } from "./_components/earnings-tabs";

export const metadata: Metadata = { title: "My earnings" };

export default async function MyEarningsPage() {
  await requireUser();
  const active = await getActiveOrg();
  // The (app) layout already redirects when there's no active org; this is a
  // defensive null-guard so the page is safe to render in isolation.
  if (!active) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Only data this page is allowed to read: payouts where memberUserId = current user.
  // The query is internally gated by requireUserAction(). No org-wide expenses,
  // no all-org payouts, no P&L — this page is self-isolated by design.
  const data = await getMyEarnings({ from: undefined, to: undefined });

  return (
    <div className="space-y-6">
      <EarningsHero
        data={data}
        currency={active.org.defaultCurrency}
        startOfMonth={startOfMonth}
      />
      <EarningsTabs rows={data.rows} currency={active.org.defaultCurrency} />
    </div>
  );
}
