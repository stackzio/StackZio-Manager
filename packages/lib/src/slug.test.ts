import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "./slug.js";

describe("slugify", () => {
  it("lowercases and dasherizes", () => {
    expect(slugify("StackZio Studio")).toBe("stackzio-studio");
  });

  it("strips diacritics", () => {
    expect(slugify("Café Münchën")).toBe("cafe-munchen");
  });

  it("returns empty for non-alpha input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns base when free", () => {
    expect(uniqueSlug("StackZio", new Set())).toBe("stackzio");
  });

  it("appends counter when taken", () => {
    expect(uniqueSlug("StackZio", new Set(["stackzio"]))).toBe("stackzio-2");
    expect(uniqueSlug("StackZio", new Set(["stackzio", "stackzio-2"]))).toBe("stackzio-3");
  });

  it("falls back to org when input is empty", () => {
    expect(uniqueSlug("!!!", new Set())).toBe("org");
  });
});
