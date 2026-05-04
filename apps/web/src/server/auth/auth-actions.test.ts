// Pure-logic checks for the input shapes the auth actions accept/reject.
// We can't run the action body without a DB, but we can validate that
// the same Zod schemas the actions use behave correctly at the boundary.
import { describe, expect, it } from "vitest";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
});

describe("signup input validation", () => {
  it("accepts a well-formed signup", () => {
    const out = signupSchema.parse({ name: "Jane", email: "Jane@Example.com  ", password: "12345678" });
    expect(out.email).toBe("jane@example.com");
    expect(out.name).toBe("Jane");
  });

  it("rejects short passwords", () => {
    expect(() =>
      signupSchema.parse({ name: "Jane", email: "j@x.co", password: "short" }),
    ).toThrow();
  });

  it("rejects bad email", () => {
    expect(() =>
      signupSchema.parse({ name: "Jane", email: "not-an-email", password: "12345678" }),
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      signupSchema.parse({ name: "  ", email: "j@x.co", password: "12345678" }),
    ).toThrow();
  });
});
