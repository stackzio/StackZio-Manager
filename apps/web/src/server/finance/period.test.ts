import { describe, it, expect } from "vitest";
import { periodRange } from "./period";

const TZ = "Asia/Kolkata";

describe("periodRange", () => {
  it("this_month — first to last in org tz", () => {
    const now = new Date("2026-05-11T12:00:00Z");
    const { from, to } = periodRange("this_month", TZ, now);
    // IST = UTC+5:30. Start of May in IST = 2026-04-30T18:30:00Z
    expect(from.toISOString()).toBe("2026-04-30T18:30:00.000Z");
    expect(to.toISOString()).toBe("2026-05-31T18:29:59.999Z");
  });

  it("last_month — April in IST when now is May", () => {
    const { from, to } = periodRange("last_month", TZ, new Date("2026-05-11T12:00:00Z"));
    expect(from.toISOString()).toBe("2026-03-31T18:30:00.000Z");
    expect(to.toISOString()).toBe("2026-04-30T18:29:59.999Z");
  });

  it("custom — start of day to end of day in tz", () => {
    const r = periodRange("custom", TZ, new Date(), {
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 31),
    });
    expect(r.from.getTime()).toBeLessThan(r.to.getTime());
  });

  it("UTC org — boundaries are unchanged", () => {
    const { from, to } = periodRange("this_month", "UTC", new Date("2026-05-11T00:00:00Z"));
    expect(from.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-05-31T23:59:59.999Z");
  });

  it("DST spring-forward — March in America/New_York spans the transition", () => {
    // In 2026, US DST spring-forward is Sunday March 8.
    // The local "March" in NY is March 1 00:00 EST → March 31 23:59:59 EDT.
    const now = new Date("2026-03-15T12:00:00Z");
    const { from, to } = periodRange("this_month", "America/New_York", now);
    // Mar 1 00:00 EST (UTC-5) = 2026-03-01T05:00:00Z
    expect(from.toISOString()).toBe("2026-03-01T05:00:00.000Z");
    // Mar 31 23:59:59.999 EDT (UTC-4) = 2026-04-01T03:59:59.999Z
    expect(to.toISOString()).toBe("2026-04-01T03:59:59.999Z");
  });

  it("leap year — Feb in a leap year is 29 days long", () => {
    const now = new Date("2024-02-15T12:00:00Z");
    const { from, to } = periodRange("this_month", "UTC", now);
    expect(from.toISOString()).toBe("2024-02-01T00:00:00.000Z");
    // Feb 29 23:59:59.999 UTC
    expect(to.toISOString()).toBe("2024-02-29T23:59:59.999Z");
  });

  it("year boundary — this_month for December rolls forward to January", () => {
    const { from, to } = periodRange("this_month", "UTC", new Date("2026-12-15T00:00:00Z"));
    expect(from.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-12-31T23:59:59.999Z");
  });

  it("last_3_months — full 3-month window inclusive of the current month", () => {
    // March, April, May
    const { from, to } = periodRange("last_3_months", "UTC", new Date("2026-05-15T00:00:00Z"));
    expect(from.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-05-31T23:59:59.999Z");
  });

  it("custom range without args throws", () => {
    expect(() => periodRange("custom", "UTC", new Date())).toThrow();
  });
});
