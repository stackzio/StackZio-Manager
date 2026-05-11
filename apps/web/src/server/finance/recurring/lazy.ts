import { materializeDueRules } from "./materialize";

/**
 * Fire-and-forget catch-up for the current org. Called from server pages on
 * mount so that even if the Vercel Cron is paused, opening /expenses or
 * /finance will surface any rules that should have run by now.
 *
 * Caveats:
 * - Awaiting this is fine on the server, but we intentionally don't surface
 *   errors to the user — the cron is the authoritative path.
 * - Cheap when there's nothing due (single indexed query: nextRunAt <= now
 *   AND active AND organizationId = ?).
 */
export async function catchUpOrgRecurring(organizationId: string): Promise<void> {
  try {
    await materializeDueRules({ organizationId });
  } catch (e) {
    console.warn("[recurring] lazy catch-up failed", organizationId, e);
  }
}
