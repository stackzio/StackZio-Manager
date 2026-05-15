import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@stackzio/db", async () => {
  const actual = await vi.importActual<typeof import("@stackzio/db")>("@stackzio/db");
  return {
    ...actual,
    prisma: {
      client: { findFirst: vi.fn() },
      clientNote: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

vi.mock("@/server/auth/guards", () => ({ requireOrgAction: vi.fn() }));
vi.mock("@/server/activity/log", () => ({ logActivity: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/server/cache", () => ({ tagOrgClients: (id: string) => `org:${id}:clients` }));

import { prisma } from "@stackzio/db";
import { requireOrgAction } from "@/server/auth/guards";
import {
  addClientNoteAction,
  updateClientNoteAction,
  deleteClientNoteAction,
} from "./notes.actions";

const memberCtx = { org: { id: "org1" }, user: { id: "u1" }, role: "MEMBER" as const };
const adminCtx = { org: { id: "org1" }, user: { id: "u2" }, role: "ADMIN" as const };

beforeEach(() => vi.clearAllMocks());

describe("addClientNoteAction", () => {
  it("rejects when client not in org", async () => {
    (requireOrgAction as ReturnType<typeof vi.fn>).mockResolvedValue(memberCtx);
    (prisma.client.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await addClientNoteAction({ clientId: "c1", body: "hi", kind: "NOTE" });
    expect(res).toEqual({ ok: false, error: "Client not found" });
  });
  it("creates the note with author = current user", async () => {
    (requireOrgAction as ReturnType<typeof vi.fn>).mockResolvedValue(memberCtx);
    (prisma.client.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    (prisma.clientNote.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "n1" });
    const res = await addClientNoteAction({ clientId: "c1", body: " hello ", kind: "CALL" });
    expect(res).toEqual({ ok: true, noteId: "n1" });
    expect(prisma.clientNote.create).toHaveBeenCalledWith({
      data: { clientId: "c1", authorId: "u1", body: "hello", kind: "CALL" },
    });
  });
});

describe("updateClientNoteAction", () => {
  it("rejects when note not in org client", async () => {
    (requireOrgAction as ReturnType<typeof vi.fn>).mockResolvedValue(memberCtx);
    (prisma.clientNote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateClientNoteAction({ id: "n1", body: "x", kind: "NOTE" });
    expect(res.ok).toBe(false);
  });
  it("rejects when caller is non-author MEMBER", async () => {
    (requireOrgAction as ReturnType<typeof vi.fn>).mockResolvedValue(memberCtx);
    (prisma.clientNote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "n1",
      authorId: "someoneElse",
      client: { organizationId: "org1" },
    });
    const res = await updateClientNoteAction({ id: "n1", body: "x", kind: "NOTE" });
    expect(res).toEqual({ ok: false, error: "Not allowed" });
  });
  it("allows author MEMBER to update", async () => {
    (requireOrgAction as ReturnType<typeof vi.fn>).mockResolvedValue(memberCtx);
    (prisma.clientNote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "n1",
      authorId: "u1",
      client: { organizationId: "org1" },
    });
    (prisma.clientNote.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await updateClientNoteAction({ id: "n1", body: "fixed", kind: "EMAIL" });
    expect(res.ok).toBe(true);
  });
  it("allows ADMIN to update any note", async () => {
    (requireOrgAction as ReturnType<typeof vi.fn>).mockResolvedValue(adminCtx);
    (prisma.clientNote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "n1",
      authorId: "u1",
      client: { organizationId: "org1" },
    });
    (prisma.clientNote.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await updateClientNoteAction({ id: "n1", body: "fixed", kind: "EMAIL" });
    expect(res.ok).toBe(true);
  });
});

describe("deleteClientNoteAction", () => {
  it("rejects non-author MEMBER", async () => {
    (requireOrgAction as ReturnType<typeof vi.fn>).mockResolvedValue(memberCtx);
    (prisma.clientNote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "n1",
      authorId: "someoneElse",
      client: { organizationId: "org1" },
    });
    const res = await deleteClientNoteAction({ id: "n1" });
    expect(res.ok).toBe(false);
  });
  it("allows ADMIN to delete", async () => {
    (requireOrgAction as ReturnType<typeof vi.fn>).mockResolvedValue(adminCtx);
    (prisma.clientNote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "n1",
      authorId: "u1",
      client: { organizationId: "org1" },
    });
    (prisma.clientNote.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await deleteClientNoteAction({ id: "n1" });
    expect(res.ok).toBe(true);
  });
});
