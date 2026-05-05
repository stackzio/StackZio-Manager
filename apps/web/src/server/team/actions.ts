"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { addDays } from "date-fns";
import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { z } from "zod";
import { prisma, type OrgRole } from "@stackzio/db";
import { env, hasEmail } from "@/lib/env";
import { requireAdminAction, requireOrgAction, requireOwnerAction, requireUserAction } from "@/server/auth/guards";
import { logActivity } from "@/server/activity/log";
import { emitNotification } from "@/server/notifications/actions";
import { tagOrgMembers, tagUserOrgs } from "@/server/cache";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
});

export type InviteResult =
  | { ok: true; inviteId: string; link: string; emailSent: boolean; emailError?: string }
  | { ok: false; error: string };

export async function inviteMemberAction(input: z.infer<typeof inviteSchema>): Promise<InviteResult> {
  const ctx = await requireAdminAction();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { email, role } = parsed.data;

  // Only OWNER can mint OWNER invites.
  if (role === "OWNER" && ctx.role !== "OWNER") {
    return { ok: false, error: "Only the owner can invite a co-owner" };
  }

  // Check if the email already maps to a user already in the org.
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId: ctx.org.id, userId: existingUser.id },
    });
    if (member) return { ok: false, error: "That email is already a member of this organization" };
  }

  // Reuse a pending invite if exists.
  const existing = await prisma.organizationInvite.findFirst({
    where: { organizationId: ctx.org.id, email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });

  let invite = existing;
  if (!invite) {
    invite = await prisma.organizationInvite.create({
      data: {
        organizationId: ctx.org.id,
        email,
        role: role as OrgRole,
        invitedById: ctx.user.id,
        token: randomBytes(32).toString("hex"),
        expiresAt: addDays(new Date(), 7),
      },
    });
  }

  const baseUrl = env.AUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/invite/${invite.token}`;

  // Try to send the email if SMTP is configured. Never fail the action if the
  // mail server rejects — the invite row already exists and the link below
  // can be shared manually. The form copies the link to the clipboard.
  let emailSent = false;
  let emailError: string | undefined;
  if (hasEmail) {
    try {
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST!,
        port: Number(env.SMTP_PORT ?? 587),
        secure: Number(env.SMTP_PORT ?? 587) === 465,
        auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
      });
      await transport.sendMail({
        from: env.EMAIL_FROM,
        to: email,
        subject: `${ctx.user.name ?? "Someone"} invited you to ${ctx.org.name} on StackZio Manager`,
        text: `Click to join: ${link}\n\nThis link is valid for 7 days.`,
        html: `<p>You're invited to <b>${ctx.org.name}</b> as <b>${invite.role}</b>.</p><p><a href="${link}">${link}</a></p><p>Valid for 7 days.</p>`,
      });
      emailSent = true;
    } catch (e) {
      emailError = e instanceof Error ? e.message : "Unknown error";
      console.warn(`[team-invite] Email send failed for ${email}:`, emailError);
    }
  } else {
    console.warn(`[team-invite] Email disabled. Invite link for ${email}: ${link}`);
  }

  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "team",
    entityId: invite.id,
    action: "invited",
    metadata: { email, role: invite.role },
  });

  revalidatePath("/team");
  return { ok: true, inviteId: invite.id, link, emailSent, emailError };
}

export async function revokeInviteAction(inviteId: string) {
  const ctx = await requireAdminAction();
  const invite = await prisma.organizationInvite.findFirst({
    where: { id: inviteId, organizationId: ctx.org.id, acceptedAt: null },
  });
  if (!invite) return { ok: false as const, error: "Invite not found" };
  await prisma.organizationInvite.delete({ where: { id: inviteId } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "team",
    entityId: inviteId,
    action: "invite_revoked",
    metadata: { email: invite.email },
  });
  revalidatePath("/team");
  return { ok: true as const };
}

const roleSchema = z.object({ role: z.enum(["OWNER", "ADMIN", "MEMBER"]) });

export async function changeMemberRoleAction(memberId: string, input: z.infer<typeof roleSchema>) {
  const ctx = await requireAdminAction();
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid role" };
  const { role } = parsed.data;

  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.org.id },
  });
  if (!member) return { ok: false as const, error: "Member not found" };

  // Only OWNER can demote/promote OWNERs.
  if ((member.role === "OWNER" || role === "OWNER") && ctx.role !== "OWNER") {
    return { ok: false as const, error: "Only the owner can change owner roles" };
  }

  // Refuse to leave the org with no owners.
  if (member.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId: ctx.org.id, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { ok: false as const, error: "An organization must have at least one owner" };
    }
  }

  await prisma.organizationMember.update({ where: { id: memberId }, data: { role: role as OrgRole } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "team",
    entityId: member.userId,
    action: "role_changed",
    metadata: { from: member.role, to: role },
  });
  revalidatePath("/team");
  revalidateTag(tagOrgMembers(ctx.org.id));
  return { ok: true as const };
}

export async function removeMemberAction(memberId: string) {
  const ctx = await requireAdminAction();
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: ctx.org.id },
  });
  if (!member) return { ok: false as const, error: "Member not found" };

  // Owners can't be removed by admins.
  if (member.role === "OWNER" && ctx.role !== "OWNER") {
    return { ok: false as const, error: "Only the owner can remove an owner" };
  }
  if (member.role === "OWNER") {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId: ctx.org.id, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { ok: false as const, error: "An organization must have at least one owner" };
    }
  }

  // Cannot remove yourself if you're the sole admin.
  if (member.userId === ctx.user.id) {
    return { ok: false as const, error: "Use 'Leave organization' to remove yourself" };
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "team",
    entityId: member.userId,
    action: "removed",
    metadata: { role: member.role },
  });
  revalidatePath("/team");
  revalidateTag(tagOrgMembers(ctx.org.id));
  revalidateTag(tagUserOrgs(member.userId));
  return { ok: true as const };
}

export async function leaveOrganizationAction() {
  const ctx = await requireOrgAction();
  const member = await prisma.organizationMember.findFirst({
    where: { organizationId: ctx.org.id, userId: ctx.user.id },
  });
  if (!member) return { ok: false as const, error: "You are not a member" };

  if (member.role === "OWNER") {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId: ctx.org.id, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { ok: false as const, error: "Promote another member to owner before leaving" };
    }
  }

  await prisma.organizationMember.delete({ where: { id: member.id } });
  await logActivity({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    entity: "team",
    entityId: ctx.user.id,
    action: "left",
    metadata: { role: member.role },
  });
  revalidatePath("/", "layout");
  revalidateTag(tagOrgMembers(ctx.org.id));
  revalidateTag(tagUserOrgs(ctx.user.id));
  return { ok: true as const };
}

export async function deleteOrganizationAction() {
  const ctx = await requireOwnerAction();
  await prisma.organization.delete({ where: { id: ctx.org.id } });
  return { ok: true as const };
}

// Accept invite — for the recipient, after signup/signin.
export async function acceptInviteAction(token: string) {
  const user = await requireUserAction();
  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return { ok: false as const, error: "Invite is invalid or expired" };
  }
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false as const, error: "This invite is for a different email address" };
  }
  const existing = await prisma.organizationMember.findFirst({
    where: { organizationId: invite.organizationId, userId: user.id },
  });
  if (existing) {
    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    return { ok: true as const, organizationId: invite.organizationId };
  }
  await prisma.$transaction([
    prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId: user.id,
        role: invite.role,
      },
    }),
    prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
    prisma.activityLog.create({
      data: {
        organizationId: invite.organizationId,
        actorId: user.id,
        entity: "team",
        entityId: user.id,
        action: "joined",
        metadata: { role: invite.role },
      },
    }),
  ]);

  // Notify all existing org admins that someone joined.
  const admins = await prisma.organizationMember.findMany({
    where: {
      organizationId: invite.organizationId,
      role: { in: ["OWNER", "ADMIN"] },
      userId: { not: user.id },
    },
    select: { userId: true },
  });
  for (const a of admins) {
    await emitNotification({
      userId: a.userId,
      organizationId: invite.organizationId,
      kind: "MEMBER_JOINED",
      title: "New teammate",
      body: `${user.name ?? user.email} joined ${invite.organization.name}`,
      link: "/team",
      refEntity: "team",
      refId: user.id,
      dedupeKey: `member_joined:${user.id}:${invite.organizationId}`,
    });
  }

  revalidatePath("/", "layout");
  revalidateTag(tagOrgMembers(invite.organizationId));
  revalidateTag(tagUserOrgs(user.id));
  return { ok: true as const, organizationId: invite.organizationId };
}
