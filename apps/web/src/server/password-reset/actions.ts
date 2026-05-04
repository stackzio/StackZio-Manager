"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { addHours } from "date-fns";
import nodemailer from "nodemailer";
import { z } from "zod";
import { prisma } from "@stackzio/db";
import { env, hasEmail } from "@/lib/env";

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export type RequestResult = { ok: true } | { ok: false; error: string };

export async function requestPasswordResetAction(input: z.infer<typeof requestSchema>): Promise<RequestResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid email" };
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Do not leak existence — always claim success.
  if (!user) return { ok: true };

  const token = randomBytes(32).toString("hex");
  const expires = addHours(new Date(), 1);

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
      kind: "PASSWORD_RESET",
    },
  });

  const link = `${env.AUTH_URL ?? "http://localhost:3000"}/reset-password/${token}`;

  if (hasEmail) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST!,
      port: Number(env.SMTP_PORT ?? 587),
      secure: Number(env.SMTP_PORT ?? 587) === 465,
      auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
    });
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Reset your StackZio Manager password",
      text: `Reset link (valid 1h): ${link}`,
      html: `<p>Click below to reset your password (valid 1 hour):</p><p><a href="${link}">${link}</a></p>`,
    });
  } else {
    // Surface in dev when SMTP is unconfigured so it's not lost.
    console.warn(`[password-reset] Email disabled. Reset link for ${email}: ${link}`);
  }

  return { ok: true };
}

const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

export type ResetResult = { ok: true } | { ok: false; error: string };

export async function resetPasswordAction(input: z.infer<typeof resetSchema>): Promise<ResetResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { token, password } = parsed.data;

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.kind !== "PASSWORD_RESET") return { ok: false, error: "Invalid or expired link" };
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
    return { ok: false, error: "Link expired" };
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) return { ok: false, error: "Account not found" };

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return { ok: true };
}
