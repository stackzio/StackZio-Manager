import { describe, it, expect } from "vitest";
import { upsertClientSchema } from "./schemas";

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
