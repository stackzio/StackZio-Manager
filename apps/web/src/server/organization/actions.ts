"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@stackzio/db";
import { uniqueSlug } from "@stackzio/lib/slug";
import { z } from "zod";
import { ACTIVE_ORG_COOKIE, getCurrentUser, requireAdminAction, requireOrgAction, requireUserAction } from "@/server/auth/guards";

const createOrgSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  contactEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z.string().trim().url().optional().or(z.literal("")),
  defaultCurrency: z.string().trim().min(3).max(3).optional(),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;

export type CreateOrgResult =
  | { ok: true; organizationId: string; slug: string }
  | { ok: false; error: string };

export async function createOrganizationAction(input: CreateOrgInput): Promise<CreateOrgResult> {
  const user = await requireUserAction();
  const parsed = createOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Compute a unique slug.
  const baseSlug = data.name;
  const all = await prisma.organization.findMany({ select: { slug: true } });
  const slug = uniqueSlug(baseSlug, new Set(all.map((o) => o.slug)));

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        slug,
        name: data.name,
        description: data.description || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        website: data.website || null,
        defaultCurrency: data.defaultCurrency ?? "INR",
        createdById: user.id,
      },
    });
    await tx.organizationMember.create({
      data: { organizationId: created.id, userId: user.id, role: "OWNER" },
    });
    await tx.activityLog.create({
      data: {
        organizationId: created.id,
        actorId: user.id,
        entity: "organization",
        entityId: created.id,
        action: "created",
        metadata: { name: created.name },
      },
    });
    return created;
  });

  // Set as active org.
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, org.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return { ok: true, organizationId: org.id, slug: org.slug };
}

const switchSchema = z.object({ organizationId: z.string().min(1) });

export async function switchOrganizationAction(input: z.infer<typeof switchSchema>) {
  const user = await requireUserAction();
  const parsed = switchSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const member = await prisma.organizationMember.findFirst({
    where: { userId: user.id, organizationId: parsed.data.organizationId },
  });
  if (!member) return { ok: false as const, error: "You are not a member of that organization" };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, parsed.data.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

const updateOrgSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional().or(z.literal("")),
  contactEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z.string().trim().url().optional().or(z.literal("")),
  addressLine1: z.string().trim().max(120).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  defaultCurrency: z.string().trim().length(3).optional(),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
});

export async function updateOrganizationAction(input: z.infer<typeof updateOrgSchema>) {
  const ctx = await requireAdminAction();
  const parsed = updateOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const updated = await prisma.organization.update({
    where: { id: ctx.org.id },
    data: {
      name: data.name,
      description: data.description || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      website: data.website || null,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      postalCode: data.postalCode || null,
      defaultCurrency: data.defaultCurrency ?? ctx.org.defaultCurrency,
      logoUrl: data.logoUrl || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      entity: "organization",
      entityId: ctx.org.id,
      action: "updated",
      metadata: {},
    },
  });

  revalidatePath("/organization");
  revalidatePath("/", "layout");
  return { ok: true as const, organization: updated };
}

export async function listMyOrganizations() {
  const user = await getCurrentUser();
  if (!user) return [];
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
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
}

export async function getActiveOrganizationDetails() {
  const ctx = await requireOrgAction();
  return ctx.org;
}
