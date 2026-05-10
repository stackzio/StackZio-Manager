import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma, type OrgRole } from "@stackzio/db";
import { auth } from "./index";

export const ACTIVE_ORG_COOKIE = "stackzio_active_org";

/** Project-level financials: prices, payments, client info. */
export function canSeeProjectFinancials(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Org-level financials: P&L dashboard, all expenses, all payouts to others. */
export function canSeeOrgFinancials(
  role: OrgRole,
  canSeeFinancials: boolean,
): boolean {
  return role === "OWNER" || (role === "ADMIN" && canSeeFinancials);
}

/** Manage org-level financials. Same gate as viewing. */
export function canManageOrgFinancials(
  role: OrgRole,
  canSeeFinancials: boolean,
): boolean {
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

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NO_ORG" = "UNAUTHENTICATED",
  ) {
    super(message);
  }
}

/**
 * React.cache() memoises the result for the duration of a single request,
 * so multiple components / queries that all need the active org share one
 * DB lookup instead of issuing 3+ identical queries.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name,
    image: session.user.image,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireUserAction() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Not signed in", "UNAUTHENTICATED");
  return user;
}

export const getActiveOrg = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  const findMember = (where: { userId: string; organizationId?: string }) =>
    prisma.organizationMember.findFirst({
      where,
      include: { organization: true },
      orderBy: { joinedAt: "desc" },
    });

  const member =
    (activeId
      ? await findMember({ userId: user.id, organizationId: activeId })
      : null) ?? (await findMember({ userId: user.id }));

  if (!member) return null;
  return {
    org: member.organization,
    role: member.role,
    canSeeFinancials: member.canSeeFinancials,
  };
});

export const requireOrg = cache(async () => {
  const user = await requireUser();
  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/create-organization");
  return { user, ...active };
});

export async function requireOrgAction(roles?: OrgRole[]) {
  const user = await requireUserAction();
  const active = await getActiveOrg();
  if (!active) throw new AuthError("No active organization", "NO_ORG");
  if (roles && !roles.includes(active.role)) {
    throw new AuthError(`Requires role: ${roles.join(", ")}`, "FORBIDDEN");
  }
  return { user, ...active };
}

export async function requireAdminAction() {
  return requireOrgAction(["OWNER", "ADMIN"]);
}

export async function requireOwnerAction() {
  return requireOrgAction(["OWNER"]);
}

export const requireSuperAdmin = cache(async () => {
  const user = await requireUser();
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isSuperAdmin: true },
  });
  if (!record?.isSuperAdmin) redirect("/dashboard");
  return user;
});

export async function requireSuperAdminAction() {
  const user = await requireUserAction();
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isSuperAdmin: true },
  });
  if (!record?.isSuperAdmin) {
    throw new AuthError("Super admin only", "FORBIDDEN");
  }
  return user;
}

export async function requireOrgFinance() {
  const ctx = await requireOrgAction();
  if (!canSeeOrgFinancials(ctx.role, ctx.canSeeFinancials)) {
    throw new AuthError("Finance access required", "FORBIDDEN");
  }
  return ctx;
}

export async function requirePageOrgFinance() {
  const ctx = await requireOrg();
  if (!canSeeOrgFinancials(ctx.role, ctx.canSeeFinancials)) {
    redirect("/dashboard");
  }
  return ctx;
}