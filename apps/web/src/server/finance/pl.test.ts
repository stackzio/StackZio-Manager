import { describe, it, expect } from "vitest";
import { Prisma } from "@stackzio/db";
import { sum, net, zero, toFixed2 } from "./pl";

const D = (s: string | number) => new Prisma.Decimal(s);

describe("Decimal math", () => {
  it("0.1 + 0.2 = 0.30 exact", () => {
    expect(sum([D("0.1"), D("0.2")]).toString()).toBe("0.3");
  });

  it("ignores nulls/undefined", () => {
    expect(sum([D("1"), null, undefined, D("2")]).toString()).toBe("3");
  });

  it("net = rev - exp - payouts, exact", () => {
    expect(net(D("100000.50"), D("12345.67"), D("23456.89")).toString()).toBe("64197.94");
  });

  it("net can go negative", () => {
    expect(net(D("100"), D("80"), D("50")).toString()).toBe("-30");
  });

  it("zero default", () => {
    expect(zero().toString()).toBe("0");
  });

  it("toFixed2 renders 2 decimals", () => {
    expect(toFixed2(D("3"))).toBe("3.00");
    expect(toFixed2(null)).toBe("0.00");
  });
});
