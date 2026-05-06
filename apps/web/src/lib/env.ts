import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SUPERADMIN_EMAILS: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

// During Vercel build, required env vars may not be set yet (first deploy).
// We log a warning instead of throwing so the build can complete; if they're
// still missing at runtime, the actual API call will surface a real error.
const parsed = serverEnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Only log during build — don't spam the dev console.
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.SKIP_ENV_VALIDATION === "1") {
    console.warn(
      "[env] Some required env vars are missing or invalid (will fail at runtime if used):",
      JSON.stringify(parsed.error.flatten().fieldErrors),
    );
  } else {
    throw new Error(
      "Invalid env: " +
        JSON.stringify(parsed.error.flatten().fieldErrors) +
        ". Set DATABASE_URL and AUTH_SECRET (min 32 chars) at minimum.",
    );
  }
}

export const env: ServerEnv = (parsed.success ? parsed.data : (process.env as unknown)) as ServerEnv;

export const hasGoogleAuth = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
export const hasEmail = Boolean(
  env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM,
);
export const hasCloudinary = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

export const SUPERADMIN_EMAIL_SET = new Set(
  (env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPERADMIN_EMAIL_SET.has(email.toLowerCase());
}
