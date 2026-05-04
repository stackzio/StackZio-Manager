import { describe, it, expect } from "vitest";
import { formatMoney, outstanding, paidPct, sumPayments } from "./money.js";

describe("formatMoney", () => {
  it("formats INR with grouping", () => {
    expect(formatMoney(150000, "INR")).toMatch(/1,50,000/);
  });

  it("returns em-dash for invalid", () => {
    expect(formatMoney("not-a-number", "INR")).toBe("—");
  });

  it("supports compact notation", () => {
    expect(formatMoney(1_200_000, "USD", { compact: true })).toMatch(/1\.2M/);
  });
});

describe("sumPayments", () => {
  it("sums numeric and string amounts", () => {
    expect(sumPayments([{ amount: "100" }, { amount: 50 }, { amount: "0.5" }])).toBe(150.5);
  });

  it("returns 0 on empty list", () => {
    expect(sumPayments([])).toBe(0);
  });
});

describe("outstanding", () => {
  it("subtracts paid from total", () => {
    expect(outstanding(1000, 250)).toBe(750);
  });

  it("never returns negative", () => {
    expect(outstanding(100, 200)).toBe(0);
  });
});

describe("paidPct", () => {
  it("computes a percentage capped at 100", () => {
    expect(paidPct(1000, 500)).toBe(50);
    expect(paidPct(1000, 2000)).toBe(100);
  });

  it("returns 0 when total is 0", () => {
    expect(paidPct(0, 100)).toBe(0);
  });
});
