"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@stackzio/db";
import { z } from "zod";
import { signIn, signOut } from "./index";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
});

export type SignupResult =
  | { ok: true }
  | { ok: false; error: string; field?: "name" | "email" | "password" | "form" };

export async function signupAction(input: z.infer<typeof signupSchema>): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Invalid input",
      field: first?.path[0] as "name" | "email" | "password" | undefined,
    };
  }
  const { name, email, password } = parsed.data;

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return { ok: false, error: "An account with that email already exists", field: "email" };
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { name, email, passwordHash } });
    return { ok: true };
  } catch (err) {
    // Surface a useful message instead of letting it bubble into error.tsx —
    // common causes: DB unreachable from the function (network), Prisma
    // connection-pool exhausted, env vars missing.
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[signupAction] failed", msg, err);
    return {
      ok: false,
      error: "Couldn't create the account: " + truncate(msg, 200),
      field: "form",
    };
  }
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginAction(input: z.infer<typeof loginSchema>): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid email or password" };
  }
}

export async function signOutAction() {
  await signOut({ redirect: false });
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
