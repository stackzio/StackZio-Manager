import { describe, it, expect } from "vitest";
import { upsertProjectSchema, upsertTaskSchema } from "./schemas";

describe("upsertProjectSchema", () => {
  const base = {
    name: "Site refresh",
    clientId: "c1",
    ownerId: "u1",
    category: "WEBSITE" as const,
    status: "IN_PROGRESS" as const,
    priceTotal: "12500.50",
    currency: "INR",
    progressPct: 33,
    memberIds: ["u2"],
  };

  it("parses a valid input and coerces price to number", () => {
    const out = upsertProjectSchema.parse(base);
    expect(out.priceTotal).toBe(12500.5);
    expect(out.progressPct).toBe(33);
    expect(out.currency).toBe("INR");
  });

  it("rejects negative price", () => {
    expect(() => upsertProjectSchema.parse({ ...base, priceTotal: -1 })).toThrow();
  });

  it("clamps progress to 0..100", () => {
    expect(upsertProjectSchema.parse({ ...base, progressPct: 999 }).progressPct).toBe(100);
    expect(upsertProjectSchema.parse({ ...base, progressPct: -42 }).progressPct).toBe(0);
  });

  it("requires name", () => {
    expect(() => upsertProjectSchema.parse({ ...base, name: "" })).toThrow();
  });

  it("uppercases currency", () => {
    expect(upsertProjectSchema.parse({ ...base, currency: "usd" }).currency).toBe("USD");
  });

  it("rejects unknown status", () => {
    expect(() => upsertProjectSchema.parse({ ...base, status: "WAT" as never })).toThrow();
  });
});

describe("upsertTaskSchema", () => {
  it("defaults status to TODO and parses dates", () => {
    const out = upsertTaskSchema.parse({ title: "Wireframes", dueDate: "2026-06-01" });
    expect(out.status).toBe("TODO");
    expect(out.dueDate?.toISOString().slice(0, 10)).toBe("2026-06-01");
  });

  it("rejects empty title", () => {
    expect(() => upsertTaskSchema.parse({ title: "" })).toThrow();
  });
});
