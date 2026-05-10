// Pure, dependency-free RBAC predicates.
//
// Kept in its own module (no `next/headers`, no `prisma`) so client
// components can import these without dragging server-only code into
// the client bundle. The `guards.ts` module re-exports them for
// server-side callers that already pull guards anyway.

import type { OrgRole } from "@stackzio/db";

/** Project-level financials: prices, payments, client info. */
export function canSeeProjectFinancials(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Org-level financials: P&L dashboard, all expenses, all payouts to others. */
export function canSeeOrgFinancials(role: OrgRole, canSeeFinancials: boolean): boolean {
  return role === "OWNER" || (role === "ADMIN" && canSeeFinancials);
}

/** Manage org-level financials. Same gate as viewing. */
export function canManageOrgFinancials(role: OrgRole, canSeeFinancials: boolean): boolean {
  return canSeeOrgFinancials(role, canSeeFinancials);
}

/** Toggle another member's finance-access flag. Owner only. */
export function canGrantFinanceAccess(role: OrgRole): boolean {
  return role === "OWNER";
}

/** Can this role upload / link / delete project documents? */
export function canManageDocs(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}
