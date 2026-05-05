import { unstable_cache } from "next/cache";
import { prisma } from "@stackzio/db";

/**
 * Tag-based caching for "stable" per-org lookups (members list, clients
 * dropdown, etc.). These are read on many pages; without caching every
 * navigation hits the DB. Mutations call revalidateTag(...) to bust them.
 *
 * Tags:
 *   org:<id>:clients  — dropdown / autocomplete data
 *   org:<id>:members  — team member list (used by every form with a multiselect)
 *   org:<id>:projects-lite — project picker for meeting form
 *   user:<id>:orgs    — organisation switcher in topbar
 */

export function tagOrgClients(orgId: string) {
  return `org:${orgId}:clients`;
}
export function tagOrgMembers(orgId: string) {
  return `org:${orgId}:members`;
}
export function tagOrgProjectsLite(orgId: string) {
  return `org:${orgId}:projects-lite`;
}
export function tagUserOrgs(userId: string) {
  return `user:${userId}:orgs`;
}

export const cachedOrgClients = (orgId: string) =>
  unstable_cache(
    async () =>
      prisma.client.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, company: true },
        orderBy: { name: "asc" },
      }),
    ["org-clients", orgId],
    { tags: [tagOrgClients(orgId)], revalidate: 60 },
  )();

export const cachedOrgMembers = (orgId: string) =>
  unstable_cache(
    async () => {
      const memberships = await prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      });
      return memberships.map((m) => ({ ...m.user, role: m.role }));
    },
    ["org-members", orgId],
    { tags: [tagOrgMembers(orgId)], revalidate: 60 },
  )();

export const cachedOrgProjectsLite = (orgId: string) =>
  unstable_cache(
    async () =>
      prisma.project.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ["org-projects-lite", orgId],
    { tags: [tagOrgProjectsLite(orgId)], revalidate: 60 },
  )();

export const cachedUserOrgs = (userId: string) =>
  unstable_cache(
    async () => {
      const memberships = await prisma.organizationMember.findMany({
        where: { userId },
        include: { organization: true },
        orderBy: { joinedAt: "desc" },
      });
      return memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        logoUrl: m.organization.logoUrl,
        role: m.role,
      }));
    },
    ["user-orgs", userId],
    { tags: [tagUserOrgs(userId)], revalidate: 120 },
  )();
