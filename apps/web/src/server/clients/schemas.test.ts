import { describe, it, expect } from "vitest";
import { ClientInterest, ClientNoteKind } from "@stackzio/db";
import {
  upsertClientSchema,
  addClientNoteSchema,
  updateClientNoteSchema,
  deleteClientNoteSchema,
} from "./schemas";

describe("upsertClientSchema", () => {
  it("trims and lowercases email", () => {
    const out = upsertClientSchema.parse({ name: "Acme", email: "  Hi@ACME.com  " });
    expect(out.email).toBe("hi@acme.com");
  });

  it("treats empty optional fields as undefined", () => {
    const out = upsertClientSchema.parse({ name: "Acme", email: "", website: "", phone: "" });
    expect(out.email).toBeUndefined();
    expect(out.website).toBeUndefined();
    expect(out.phone).toBeUndefined();
  });

  it("rejects empty name", () => {
    expect(() => upsertClientSchema.parse({ name: "" })).toThrow();
  });

  it("rejects bad website URL", () => {
    expect(() => upsertClientSchema.parse({ name: "Acme", website: "not a url" })).toThrow();
  });

  it("accepts up to 20 contacts", () => {
    const contacts = Array.from({ length: 20 }, (_, i) => ({ name: `c${i}` }));
    const out = upsertClientSchema.parse({ name: "Acme", contacts });
    expect(out.contacts).toHaveLength(20);
  });
});

describe("upsertClientSchema sales fields", () => {
  it("defaults interestStatus to NEW", () => {
    const out = upsertClientSchema.parse({ name: "Acme" });
    expect(out.interestStatus).toBe(ClientInterest.NEW);
  });
  it("accepts a valid interestStatus", () => {
    const out = upsertClientSchema.parse({ name: "Acme", interestStatus: "FOLLOW_UP" });
    expect(out.interestStatus).toBe("FOLLOW_UP");
  });
  it("rejects unknown interestStatus", () => {
    expect(() => upsertClientSchema.parse({ name: "Acme", interestStatus: "BOGUS" })).toThrow();
  });
  it("coerces followUpAt strings to Date", () => {
    const out = upsertClientSchema.parse({ name: "Acme", followUpAt: "2026-06-01" });
    expect(out.followUpAt).toBeInstanceOf(Date);
  });
  it("treats empty followUpAt as null", () => {
    const out = upsertClientSchema.parse({ name: "Acme", followUpAt: null });
    expect(out.followUpAt).toBeNull();
  });
  it("trims followUpReason and treats empty as undefined", () => {
    const out = upsertClientSchema.parse({ name: "Acme", followUpReason: "  send proposal  " });
    expect(out.followUpReason).toBe("send proposal");
    const out2 = upsertClientSchema.parse({ name: "Acme", followUpReason: "" });
    expect(out2.followUpReason).toBeUndefined();
  });
});

describe("addClientNoteSchema", () => {
  it("requires non-empty body", () => {
    expect(() => addClientNoteSchema.parse({ clientId: "abc", body: "" })).toThrow();
  });
  it("trims body and defaults kind to NOTE", () => {
    const out = addClientNoteSchema.parse({ clientId: "abc", body: "  spoke today  " });
    expect(out.body).toBe("spoke today");
    expect(out.kind).toBe(ClientNoteKind.NOTE);
  });
  it("accepts each ClientNoteKind", () => {
    for (const k of ["NOTE", "CALL", "EMAIL", "MEETING", "WHATSAPP"] as const) {
      const out = addClientNoteSchema.parse({ clientId: "abc", body: "x", kind: k });
      expect(out.kind).toBe(k);
    }
  });
  it("rejects body over 4000 chars", () => {
    expect(() =>
      addClientNoteSchema.parse({ clientId: "abc", body: "x".repeat(4001) }),
    ).toThrow();
  });
});

describe("updateClientNoteSchema", () => {
  it("requires id, body, kind", () => {
    expect(() => updateClientNoteSchema.parse({ id: "n1", body: "" })).toThrow();
    const out = updateClientNoteSchema.parse({ id: "n1", body: "ok", kind: "CALL" });
    expect(out).toEqual({ id: "n1", body: "ok", kind: "CALL" });
  });
});

describe("deleteClientNoteSchema", () => {
  it("requires non-empty id", () => {
    expect(() => deleteClientNoteSchema.parse({ id: "" })).toThrow();
  });
});
