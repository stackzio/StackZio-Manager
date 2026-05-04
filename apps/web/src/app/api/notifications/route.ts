import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getMyNotifications } from "@/server/notifications/queries";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const sweep = url.searchParams.get("sweep") === "1";
  const data = await getMyNotifications({ sweep });
  return NextResponse.json(data);
}
