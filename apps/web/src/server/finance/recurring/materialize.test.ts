import { describe, it, expect } from "vitest";
import { computeNextRunAt, type CadenceInput } from "./date";

function fakeRule(partial: Partial<CadenceInput>): CadenceInput {
  return {
    frequency: "MONTHLY",
    dayOfMonth: 1,
    monthOfYear: null,
    ...partial,
  };
}

describe("computeNextRunAt — MONTHLY", () => {
  it("picks the same month if day not yet passed", () => {
    const rule = fakeRule({ frequency: "MONTHLY", dayOfMonth: 15 });
    const r = computeNextRunAt(rule, new Date("2026-05-10T00:00:00Z"));
    expect(r.toISOString()).toBe("2026-05-15T00:00:00.000Z");
  });

  it("rolls to next month when current month's day already passed", () => {
    const rule = fakeRule({ frequency: "MONTHLY", dayOfMonth: 5 });
    const r = computeNextRunAt(rule, new Date("2026-05-10T00:00:00Z"));
    expect(r.toISOString()).toBe("2026-06-05T00:00:00.000Z");
  });

  it("clamps day-31 to Feb 28 in non-leap years", () => {
    const rule = fakeRule({ frequency: "MONTHLY", dayOfMonth: 31 });
    const r = computeNextRunAt(rule, new Date("2026-02-01T00:00:00Z"));
    expect(r.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("clamps day-31 to Feb 29 in leap years", () => {
    const rule = fakeRule({ frequency: "MONTHLY", dayOfMonth: 31 });
    const r = computeNextRunAt(rule, new Date("2024-02-01T00:00:00Z"));
    expect(r.toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });

  it("crosses year boundary correctly", () => {
    const rule = fakeRule({ frequency: "MONTHLY", dayOfMonth: 5 });
    const r = computeNextRunAt(rule, new Date("2026-12-10T00:00:00Z"));
    expect(r.toISOString()).toBe("2027-01-05T00:00:00.000Z");
  });

  it("when `from` exactly matches the slot, picks today (not next month)", () => {
    const rule = fakeRule({ frequency: "MONTHLY", dayOfMonth: 15 });
    const r = computeNextRunAt(rule, new Date("2026-05-15T00:00:00Z"));
    expect(r.toISOString()).toBe("2026-05-15T00:00:00.000Z");
  });

  it("day=30 in February clamps to 28/29", () => {
    const ruleNonLeap = fakeRule({ frequency: "MONTHLY", dayOfMonth: 30 });
    expect(
      computeNextRunAt(ruleNonLeap, new Date("2026-02-15T00:00:00Z")).toISOString(),
    ).toBe("2026-02-28T00:00:00.000Z");
    expect(
      computeNextRunAt(ruleNonLeap, new Date("2024-02-15T00:00:00Z")).toISOString(),
    ).toBe("2024-02-29T00:00:00.000Z");
  });
});

describe("computeNextRunAt — YEARLY", () => {
  it("picks this year if the month/day not yet passed", () => {
    const rule = fakeRule({ frequency: "YEARLY", monthOfYear: 6, dayOfMonth: 15 });
    const r = computeNextRunAt(rule, new Date("2026-05-10T00:00:00Z"));
    expect(r.toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });

  it("rolls to next year when this year's slot already passed", () => {
    const rule = fakeRule({ frequency: "YEARLY", monthOfYear: 3, dayOfMonth: 15 });
    const r = computeNextRunAt(rule, new Date("2026-05-10T00:00:00Z"));
    expect(r.toISOString()).toBe("2027-03-15T00:00:00.000Z");
  });

  it("Feb 29 yearly clamps to Feb 28 in non-leap year", () => {
    const rule = fakeRule({ frequency: "YEARLY", monthOfYear: 2, dayOfMonth: 29 });
    const r = computeNextRunAt(rule, new Date("2026-01-01T00:00:00Z"));
    // 2026 is not a leap year — clamp to Feb 28
    expect(r.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("Feb 29 yearly hits Feb 29 in next leap year", () => {
    const rule = fakeRule({ frequency: "YEARLY", monthOfYear: 2, dayOfMonth: 29 });
    const r = computeNextRunAt(rule, new Date("2028-01-01T00:00:00Z"));
    // 2028 is a leap year
    expect(r.toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it("when `from` exactly matches the slot, picks today (not next year)", () => {
    const rule = fakeRule({ frequency: "YEARLY", monthOfYear: 1, dayOfMonth: 1 });
    const r = computeNextRunAt(rule, new Date("2026-01-01T00:00:00Z"));
    expect(r.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});
