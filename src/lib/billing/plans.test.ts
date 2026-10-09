import { describe, expect, it } from "vitest";
import { subscriptionStatusEnum } from "@/db/schema";
import { isSubscriptionStatus, planForStatus, statusLabels } from "./plans";

describe("planForStatus", () => {
  it.each(["active", "trialing", "past_due"] as const)("%s → pro", (status) => {
    expect(planForStatus(status)).toBe("pro");
  });

  it.each([
    "canceled",
    "incomplete",
    "incomplete_expired",
    "unpaid",
    "paused",
  ] as const)("%s → free", (status) => {
    expect(planForStatus(status)).toBe("free");
  });
});

describe("statusLabels", () => {
  it("veritabanındaki her durumun bir etiketi var", () => {
    for (const status of subscriptionStatusEnum.enumValues) {
      expect(statusLabels[status]).toBeTruthy();
    }
    expect(isSubscriptionStatus("active")).toBe(true);
    expect(isSubscriptionStatus("bilinmeyen")).toBe(false);
  });
});
