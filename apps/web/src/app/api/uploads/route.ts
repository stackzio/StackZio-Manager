import { NextResponse } from "next/server";
import { prisma } from "@stackzio/db";
import { auth } from "@/server/auth";
import { ACTIVE_ORG_COOKIE } from "@/server/auth/guards";
import { saveImage, type UploadKind } from "@/server/uploads/store";
import { cookies } from "next/headers";
import { logActivity } from "@/server/activity/log";

const ALLOWED_KINDS: UploadKind[] = ["org-logo", "user-avatar", "project-doc"];

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  const file = form.get("file");
  const kindRaw = String(form.get("kind") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_KINDS.includes(kindRaw as UploadKind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  const kind = kindRaw as UploadKind;

  // For org-logo: must be admin/owner of the active org.
  if (kind === "org-logo") {
    const cookieStore = await cookies();
    const orgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
    if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      const saved = await saveImage({ file, kind, ownerId: orgId });
      await prisma.organization.update({ where: { id: orgId }, data: { logoUrl: saved.url } });
      await logActivity({
        organizationId: orgId,
        actorId: session.user.id,
        entity: "organization",
        entityId: orgId,
        action: "logo_updated",
        metadata: { url: saved.url },
      });
      return NextResponse.json(saved);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
    }
  }

  if (kind === "user-avatar") {
    try {
      const saved = await saveImage({ file, kind, ownerId: session.user.id });
      await prisma.user.update({ where: { id: session.user.id }, data: { image: saved.url } });
      return NextResponse.json(saved);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
    }
  }

  if (kind === "project-doc") {
    const projectId = String(form.get("projectId") ?? "");
    if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    const cookieStore = await cookies();
    const orgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
    if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: session.user.id },
    });
    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
      const saved = await saveImage({ file, kind, ownerId: project.id });
      const docKind = saved.contentType.startsWith("image/") ? "IMAGE" : "FILE";
      const doc = await prisma.projectDoc.create({
        data: {
          projectId: project.id,
          title: file.name,
          url: saved.url,
          kind: docKind,
          thumbnailUrl: docKind === "IMAGE" ? saved.url : null,
          uploadedById: session.user.id,
        },
      });
      await logActivity({
        organizationId: orgId,
        actorId: session.user.id,
        entity: "project",
        entityId: project.id,
        action: "doc_uploaded",
        metadata: { docId: doc.id, url: saved.url, kind: docKind },
      });
      return NextResponse.json({ ...saved, docId: doc.id });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unsupported kind" }, { status: 400 });
}
