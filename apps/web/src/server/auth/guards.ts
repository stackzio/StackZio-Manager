import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma, type OrgRole } from "@stackzio/db";
import { auth } from "./index";

export const ACTIVE_ORG_COOKIE = "stackzio_active_org";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NO_ORG" = "UNAUTHENTICATED",
  ) {
    super(message);
  }
}

/** Returns the session user or redirects to /login. Use in pages. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { id: session.user.id, email: session.user.email!, name: session.user.name, image: session.user.image };
}

/** Like requireUser, but returns null instead of redirecting. Use in server actions to throw structured errors. */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, email: session.user.email!, name: session.user.name, image: session.user.image };
}

export async function requireUserAction() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Not signed in", "UNAUTHENTICATED");
  return user;
}

/** Returns the active organization for the current user, or null if none. */
export async function getActiveOrg() {
  const user = await getCurrentUser();
  if (!user) return null;
  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  // Try cookie first.
  if (activeId) {
    const member = await prisma.organizationMember.findFirst({
      where: { userId: user.id, organizationId: activeId },
      include: { organization: true },
    });
    if (member) return { org: member.organization, role: member.role };
  }

  // Fall back to most-recently-joined membership.
  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { joinedAt: "desc" },
  });
  if (!member) return null;
  return { org: member.organization, role: member.role };
}

/** Use in pages — redirects to onboarding if no org. */
export async function requireOrg() {
  const user = await requireUser();
  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/create-organization");
  return { user, ...active };
}

/** Use in server actions — throws structured errors. */
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
