import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@stackzio/db", async () => {
  const actual = await vi.importActual<typeof import("@stackzio/db")>("@stackzio/db");
  return {
    ...actual,
    prisma: {
      client: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      clientNote: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock("@/server/auth/guards", () => ({
  requireOrgAction: vi.fn(),
}));

vi.mock("@/server/activity/log", () => ({ logActivity: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/server/cache", () => ({ tagOrgClients: (id: string) => `org:${id}:clients` }));

import { prisma } from "@stackzio/db";
import { requireOrgAction } from "@/server/auth/guards";
import {
  updateClientInterestAction,
  updateClientFollowUpAction,
  markFollowUpDoneAction,
} from "./sales.actions";

const ctx = { org: { id: "org1" }, user: { id: "u1" }, role: "ADMIN" as const };

beforeEach(() => {
  vi.clearAllMocks();
  (requireOrgAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(ctx);
});

describe("updateClientInterestAction", () => {
  it("rejects when client not in org", async () => {
    (prisma.client.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateClientInterestAction({ clientId: "c1", interestStatus: "INTERESTED" });
    expect(res).toEqual({ ok: false, error: "Client not found" });
  });
  it("updates interest when client found", async () => {
    (prisma.client.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    (prisma.client.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await updateClientInterestAction({ clientId: "c1", interestStatus: "INTERESTED" });
    expect(res).toEqual({ ok: true });
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { interestStatus: "INTERESTED" },
    });
  });
});

describe("updateClientFollowUpAction", () => {
  it("sets follow-up date and reason", async () => {
    (prisma.client.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    (prisma.client.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const date = new Date("2026-06-01");
    const res = await updateClientFollowUpAction({
      clientId: "c1",
      followUpAt: date,
      followUpReason: "send proposal",
    });
    expect(res.ok).toBe(true);
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { followUpAt: date, followUpReason: "send proposal" },
    });
  });
});

describe("markFollowUpDoneAction", () => {
  it("clears follow-up and creates a NOTE", async () => {
    (prisma.client.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    (prisma.client.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.clientNote.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await markFollowUpDoneAction("c1");
    expect(res.ok).toBe(true);
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { followUpAt: null, followUpReason: null },
    });
    expect(prisma.clientNote.create).toHaveBeenCalledWith({
      data: { clientId: "c1", authorId: "u1", body: "Follow-up completed", kind: "NOTE" },
    });
  });
});
