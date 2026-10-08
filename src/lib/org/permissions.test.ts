import { describe, expect, it } from "vitest";
import { can, canManageMember } from "./permissions";

describe("can", () => {
  it("owner her şeyi yapabilir", () => {
    expect(can("owner", "org:delete")).toBe(true);
    expect(can("owner", "billing:manage")).toBe(true);
  });

  it("admin üyeleri yönetebilir ama organizasyonu silemez", () => {
    expect(can("admin", "member:invite")).toBe(true);
    expect(can("admin", "org:delete")).toBe(false);
    expect(can("admin", "billing:manage")).toBe(false);
  });

  it("member hiçbir yönetim işlemi yapamaz", () => {
    expect(can("member", "member:invite")).toBe(false);
    expect(can("member", "org:update")).toBe(false);
  });
});

describe("canManageMember", () => {
  it("admin bir üyeyi admin yapabilir", () => {
    expect(canManageMember("admin", "member", "admin")).toBe(true);
  });

  it("admin kimseyi owner yapamaz ve owner'lara dokunamaz", () => {
    expect(canManageMember("admin", "member", "owner")).toBe(false);
    expect(canManageMember("admin", "owner", "member")).toBe(false);
    expect(canManageMember("admin", "owner")).toBe(false);
  });

  it("owner başka bir owner'ı yönetebilir", () => {
    expect(canManageMember("owner", "owner", "admin")).toBe(true);
  });

  it("member kimseyi yönetemez", () => {
    expect(canManageMember("member", "member", "admin")).toBe(false);
  });
});
