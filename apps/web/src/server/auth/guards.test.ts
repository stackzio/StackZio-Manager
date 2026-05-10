import { describe, it, expect, vi } from "vitest";

// The pure RBAC helpers don't touch next-auth or Prisma, but `guards.ts`
// transitively imports `./index` which boots next-auth — that fails under
// vitest's resolver. Stub the side-effecting modules so we can test the
// pure functions in isolation.
vi.mock("./index", () => ({ auth: vi.fn() }));
vi.mock("@stackzio/db", () => ({ prisma: {} }));

const {
  canSeeOrgFinancials,
  canManageOrgFinancials,
  canSeeProjectFinancials,
  canGrantFinanceAccess,
} = await import("./guards");

describe("RBAC: org-level finance", () => {
  const cases: Array<[Parameters<typeof canSeeOrgFinancials>[0], boolean, boolean]> = [
    ["OWNER",  true,  true ],
    ["OWNER",  false, true ],   // owners ignore the flag
    ["ADMIN",  true,  true ],
    ["ADMIN",  false, false],
    ["MEMBER", true,  false],   // members never
    ["MEMBER", false, false],
  ];
  it.each(cases)("role=%s flag=%s → %s", (role, flag, expected) => {
    expect(canSeeOrgFinancials(role, flag)).toBe(expected);
    expect(canManageOrgFinancials(role, flag)).toBe(expected);
  });
});

describe("RBAC: project-level finance", () => {
  it("OWNER and ADMIN see, MEMBER does not", () => {
    expect(canSeeProjectFinancials("OWNER")).toBe(true);
    expect(canSeeProjectFinancials("ADMIN")).toBe(true);
    expect(canSeeProjectFinancials("MEMBER")).toBe(false);
  });
});

describe("RBAC: granting finance access", () => {
  it("only OWNER", () => {
    expect(canGrantFinanceAccess("OWNER")).toBe(true);
    expect(canGrantFinanceAccess("ADMIN")).toBe(false);
    expect(canGrantFinanceAccess("MEMBER")).toBe(false);
  });
});
