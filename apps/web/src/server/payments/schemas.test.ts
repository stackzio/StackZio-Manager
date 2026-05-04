import { describe, it, expect } from "vitest";
import { upsertPaymentSchema } from "./schemas";

describe("upsertPaymentSchema", () => {
  const base = {
    amount: "5000",
    kind: "MILESTONE" as const,
    method: "BANK" as const,
    paidAt: "2026-05-04",
  };

  it("coerces amount to number", () => {
    expect(upsertPaymentSchema.parse(base).amount).toBe(5000);
  });

  it("rejects amount of 0 or below", () => {
    expect(() => upsertPaymentSchema.parse({ ...base, amount: 0 })).toThrow();
    expect(() => upsertPaymentSchema.parse({ ...base, amount: -1 })).toThrow();
  });

  it("requires paidAt", () => {
    expect(() => upsertPaymentSchema.parse({ ...base, paidAt: "" })).toThrow();
  });

  it("parses paidAt to a Date", () => {
    const out = upsertPaymentSchema.parse({ ...base });
    expect(out.paidAt).toBeInstanceOf(Date);
    expect(out.paidAt.toISOString().slice(0, 10)).toBe("2026-05-04");
  });
});
