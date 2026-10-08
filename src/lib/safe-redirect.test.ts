import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("site içi yolları kabul eder", () => {
    expect(safeRedirectPath("/davet?token=abc")).toBe("/davet?token=abc");
  });

  it("başka sitelere giden adresleri reddeder", () => {
    for (const value of [
      "https://kotu-site.com",
      "//kotu-site.com",
      "/\\kotu-site.com",
      "javascript:alert(1)",
      "",
      null,
    ]) {
      expect(safeRedirectPath(value)).toBe("/panel");
    }
  });
});
