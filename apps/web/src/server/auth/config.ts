import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@stackzio/db";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { env, hasGoogleAuth, isSuperadminEmail } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  secret: env.AUTH_SECRET,
  providers: [
    ...(hasGoogleAuth
      ? [
          Google({
            clientId: env.AUTH_GOOGLE_ID!,
            clientSecret: env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true, email: true, name: true, image: true, passwordHash: true },
        });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // First-time sign-in (Credentials.authorize() returned a user).
      if (user) {
        token.id = user.id;
      }

      // Subsequent calls (refresh / every page load) — verify the user still
      // exists in the DB. If they don't (e.g. we swapped databases, or the
      // account was deleted), return null to invalidate the session and sign
      // them out cleanly.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, email: true, isSuperAdmin: true },
        });
        if (!dbUser) {
          // Orphan JWT — invalidate.
          return null as never;
        }
        // Auto-promote configured superadmins (idempotent).
        if (dbUser.email && isSuperadminEmail(dbUser.email) && !dbUser.isSuperAdmin) {
          await prisma.user
            .update({ where: { id: dbUser.id }, data: { isSuperAdmin: true } })
            .catch(() => null);
          token.isSuperAdmin = true;
        } else {
          token.isSuperAdmin = dbUser.isSuperAdmin;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
      }
      return session;
    },
  },
};
