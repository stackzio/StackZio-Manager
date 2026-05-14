import { Prisma, prisma, type ExpenseRule } from "@stackzio/db";
import { emitNotification } from "@/server/notifications/actions";
import { computeNextRunAt } from "./date";

const { Decimal } = Prisma;

// Re-export so existing imports of `computeNextRunAt` from this module
// keep working — date.ts is the pure-math module that tests can import
// without pulling Prisma/Next-auth.
export { computeNextRunAt } from "./date";

/**
 * Advance `nextRunAt` to the next cycle AFTER the just-fired run.
 * Used internally by materializeRule after it materializes one occurrence.
 */
function advance(rule: ExpenseRule, justRanAt: Date): Date {
  // Move past the just-ran day by 1ms so computeNextRunAt picks the next cycle.
  const after = new Date(justRanAt.getTime() + 1);
  return computeNextRunAt(rule, after);
}

/**
 * Find members eligible to receive the "recurring expense added" notification.
 * = owner + admins with canSeeFinancials=true. Members never get this.
 */
async function findFinanceWatchers(organizationId: string): Promise<string[]> {
  const rows = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      OR: [{ role: "OWNER" }, { role: "ADMIN", canSeeFinancials: true }],
    },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

interface MaterializeOptions {
  /** Reference "now" — defaults to new Date(). Allows deterministic testing. */
  now?: Date;
}

export interface MaterializeOneResult {
  ruleId: string;
  expenseId: string | null;
  nextRunAt: Date;
  /** True when an Expense was created; false when the rule had endsOn passed
   * (now deactivated) or somehow ran past its own end. */
  created: boolean;
}

/**
 * Materialize ONE rule. Should be called inside a loop that's already filtered
 * to due rules. Safe to call directly; will no-op if the rule is past its
 * endsOn or has been deactivated since lookup.
 */
export async function materializeRule(
  rule: ExpenseRule,
  opts: MaterializeOptions = {},
): Promise<MaterializeOneResult> {
  const now = opts.now ?? new Date();

  // Hard stop if endsOn has passed.
  if (rule.endsOn && rule.endsOn.getTime() < now.getTime()) {
    await prisma.expenseRule.update({
      where: { id: rule.id },
      data: { active: false },
    });
    return { ruleId: rule.id, expenseId: null, nextRunAt: rule.nextRunAt, created: false };
  }

  // Also stop if the rule itself became inactive between scan and run.
  if (!rule.active) {
    return { ruleId: rule.id, expenseId: null, nextRunAt: rule.nextRunAt, created: false };
  }

  const spentAt = rule.nextRunAt;
  const next = advance(rule, spentAt);

  // Single transaction: create the expense, update the rule.
  const expense = await prisma.$transaction(async (tx) => {
    const e = await tx.expense.create({
      data: {
        organizationId: rule.organizationId,
        categoryId: rule.categoryId,
        vendor: rule.vendor,
        amount: new Decimal(rule.amount),
        currency: rule.currency,
        spentAt,
        method: rule.method,
        reference: rule.reference,
        note: rule.note,
        createdById: rule.createdById,
        ruleId: rule.id,
      },
      include: {
        category: { select: { name: true, color: true, icon: true } },
      },
    });
    // Auto-deactivate when the new nextRunAt would be past endsOn.
    const willDeactivate =
      rule.endsOn != null && next.getTime() > rule.endsOn.getTime();
    await tx.expenseRule.update({
      where: { id: rule.id },
      data: {
        lastRunAt: spentAt,
        nextRunAt: willDeactivate ? rule.nextRunAt : next,
        active: willDeactivate ? false : true,
      },
    });
    return e;
  });

  // Notify the org's finance watchers — fire-and-forget so a single failure
  // doesn't block the rest of the cron.
  const watchers = await findFinanceWatchers(rule.organizationId);
  const formattedAmount = `${rule.currency} ${rule.amount.toString()}`;
  const title = "Recurring expense added";
  const body = `${formattedAmount} · ${expense.category.name}${
    rule.vendor ? ` · ${rule.vendor}` : ""
  }`;
  await Promise.allSettled(
    watchers.map((userId) =>
      emitNotification({
        userId,
        organizationId: rule.organizationId,
        kind: "RECURRING_EXPENSE_ADDED",
        title,
        body,
        link: `/expenses?cats=${rule.categoryId}`,
        refEntity: "expense",
        refId: expense.id,
        dedupeKey: `expense-recurring:${expense.id}`,
      }),
    ),
  );

  return { ruleId: rule.id, expenseId: expense.id, nextRunAt: next, created: true };
}

/**
 * Materialize ALL due rules for an organization (or globally if no orgId).
 * Returns one result per rule processed.
 *
 * The cron route calls this with no `organizationId` to sweep the whole DB.
 * The lazy fallback calls it with the active org's id so a logged-in user
 * triggers their own catch-up.
 */
export async function materializeDueRules(args: {
  organizationId?: string;
  now?: Date;
} = {}): Promise<MaterializeOneResult[]> {
  const now = args.now ?? new Date();
  const due = await prisma.expenseRule.findMany({
    where: {
      active: true,
      nextRunAt: { lte: now },
      ...(args.organizationId ? { organizationId: args.organizationId } : {}),
    },
    orderBy: { nextRunAt: "asc" },
  });

  const results: MaterializeOneResult[] = [];
  for (const rule of due) {
    try {
      // A rule that's been due for multiple cycles (e.g. cron paused for two
      // months) should backfill each missed occurrence rather than skip ahead.
      // We loop materializeRule until nextRunAt > now.
      let workingRule = rule;
      let guard = 0;
      while (
        workingRule.active &&
        workingRule.nextRunAt.getTime() <= now.getTime() &&
        guard < 24 /* sanity cap */
      ) {
        const res = await materializeRule(workingRule, { now });
        results.push(res);
        if (!res.created) break;
        // Reload the rule so we have updated lastRunAt / nextRunAt / active.
        const refreshed = await prisma.expenseRule.findUnique({
          where: { id: workingRule.id },
        });
        if (!refreshed) break;
        workingRule = refreshed;
        guard++;
      }
    } catch (e) {
      console.warn("[recurring] materializeRule failed", rule.id, e);
    }
  }
  return results;
}
