"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/upload/image-upload";
import { updateProfileAction } from "@/server/user/actions";

interface Props {
  user: { id: string; name: string | null; email: string; image: string | null };
}

export function ProfileForm({ user }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [imageUrl, setImageUrl] = useState<string>(user.image ?? "");

  const initials = (user.name ?? user.email)
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get("name") ?? "").trim(),
      image: imageUrl,
    };
    start(async () => {
      const res = await updateProfileAction(input);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name and avatar are visible across all organizations you belong to.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <ImageUpload
            kind="user-avatar"
            currentUrl={user.image}
            fallbackText={initials || "U"}
            onUploaded={setImageUrl}
            rounded="full"
          />
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required defaultValue={user.name ?? ""} maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user.email} disabled readOnly />
            <p className="text-xs text-muted-foreground">
              Email changes require verification — coming in a later release.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
