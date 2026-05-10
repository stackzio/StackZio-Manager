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
});
