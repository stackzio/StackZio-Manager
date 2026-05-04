import { describe, it, expect } from "vitest";
import { upsertMeetingSchema } from "./schemas";

describe("upsertMeetingSchema", () => {
  const base = {
    title: "Kick-off",
    scheduledAt: "2026-06-01T10:30",
    durationMin: 45,
  };

  it("parses scheduledAt to a Date", () => {
    const out = upsertMeetingSchema.parse(base);
    expect(out.scheduledAt).toBeInstanceOf(Date);
  });

  it("defaults durationMin, locationKind and status", () => {
    const out = upsertMeetingSchema.parse({
      title: "Quick chat",
      scheduledAt: "2026-06-01T10:30",
    });
    expect(out.durationMin).toBe(30);
    expect(out.locationKind).toBe("ONLINE");
    expect(out.status).toBe("SCHEDULED");
  });

  it("rejects empty title", () => {
    expect(() => upsertMeetingSchema.parse({ ...base, title: "" })).toThrow();
  });

  it("rejects missing scheduledAt", () => {
    expect(() =>
      upsertMeetingSchema.parse({ ...base, scheduledAt: "" }),
    ).toThrow();
  });

  it("rejects duration outside 5..600", () => {
    expect(() => upsertMeetingSchema.parse({ ...base, durationMin: 1 })).toThrow();
    expect(() => upsertMeetingSchema.parse({ ...base, durationMin: 601 })).toThrow();
  });

  it("rejects non-URL meetingUrl", () => {
    expect(() =>
      upsertMeetingSchema.parse({ ...base, meetingUrl: "not a url" }),
    ).toThrow();
  });

  it("treats empty optional fields as undefined", () => {
    const out = upsertMeetingSchema.parse({
      ...base,
      clientId: "",
      projectId: "",
      meetingUrl: "",
      locationDetail: "",
      agenda: "",
      remarks: "",
    });
    expect(out.clientId).toBeUndefined();
    expect(out.projectId).toBeUndefined();
    expect(out.meetingUrl).toBeUndefined();
    expect(out.locationDetail).toBeUndefined();
    expect(out.agenda).toBeUndefined();
    expect(out.remarks).toBeUndefined();
  });
});
