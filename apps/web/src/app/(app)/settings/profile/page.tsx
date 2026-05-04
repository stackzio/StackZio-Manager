import type { Metadata } from "next";
import { prisma } from "@stackzio/db";
import { requireUser } from "@/server/auth/guards";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, image: true },
  });
  if (!user) return null;
  return <ProfileForm user={user} />;
}
