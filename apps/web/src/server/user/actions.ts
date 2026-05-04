"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@stackzio/db";
import { requireUserAction } from "@/server/auth/guards";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  image: z.string().trim().url().optional().or(z.literal("")),
});

export async function updateProfileAction(input: z.infer<typeof profileSchema>) {
  const user = await requireUserAction();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, image: parsed.data.image || null },
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(input: z.infer<typeof passwordSchema>) {
  const user = await requireUserAction();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record?.passwordHash) {
    return { ok: false as const, error: "Set a password via password reset (this account uses OAuth)." };
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
  if (!ok) return { ok: false as const, error: "Current password is incorrect" };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true as const };
}
