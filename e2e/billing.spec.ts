import { expect, test } from "@playwright/test";
import { createTeam, invite, signUp, uniqueEmail } from "./helpers";

/*
 * Gerçek Stripe'a gitmeden test edilebilen kısımlar. Ödemenin kendisi ve
 * webhook'tan sonra planın Pro olması veritabanı testlerinde
 * (src/lib/billing/billing.db.test.ts) sahte Stripe verisiyle deneniyor.
 */

test("ücretsiz plan 5 kişide durur", async ({ page }) => {
  await signUp(page, "Ali", uniqueEmail("ali"));
  const slug = await createTeam(page, "Küçük Ekip");

  await page.getByRole("link", { name: "Faturalandırma" }).click();
  await expect(page.getByText("1 / 5")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pro'ya geç" })).toBeVisible();

  for (let i = 1; i <= 4; i++) {
    await invite(page, slug, uniqueEmail(`kisi${i}`));
    await expect(page.getByText("adresine davet gönderildi")).toBeVisible();
  }
  await invite(page, slug, uniqueEmail("fazla"));
  await expect(page.getByText("Planının üye sınırına ulaştın")).toBeVisible();

  await page.goto(`/org/${slug}/faturalandirma`);
  await expect(page.getByText("5 / 5")).toBeVisible();
});
