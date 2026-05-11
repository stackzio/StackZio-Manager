import { NextResponse } from "next/server";
import { materializeDueRules } from "@/server/finance/recurring/materialize";

export const runtime = "nodejs";
// Don't try to prerender; this is a side-effecting endpoint.
export const dynamic = "force-dynamic";

/**
 * Daily cron endpoint that materializes due ExpenseRule rows into Expense
 * records across all organizations.
 *
 * Auth: Vercel Cron sends an `Authorization: Bearer ${CRON_SECRET}` header.
 * Locally, you can hit it with the same header. Without `CRON_SECRET` in the
 * env, the endpoint refuses to run — defense against accidental invocation.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const results = await materializeDueRules();
    const created = results.filter((r) => r.created).length;
    return NextResponse.json({
      ok: true,
      processed: results.length,
      created,
      ms: Date.now() - startedAt,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Materialize failed",
      },
      { status: 500 },
    );
  }
}
