import { expect, test } from "@playwright/test";
import {
  createTeam,
  invite,
  linkFromEmail,
  PASSWORD,
  signUp,
  uniqueEmail,
} from "./helpers";

test("davet edilen kişi kayıt olup ekibe katılır", async ({
  page,
  browser,
}) => {
  const owner = page;
  await signUp(owner, "Ali", uniqueEmail("ali"));
  const slug = await createTeam(owner, "Ali'nin Şirketi");
  expect(slug).toMatch(/^alinin-sirketi/);
  await expect(owner.getByText("Sahip")).toBeVisible();

  const ayseEmail = uniqueEmail("ayse");
  await invite(owner, slug, ayseEmail, "admin");
  await expect(owner.getByText("adresine davet gönderildi")).toBeVisible();
  await expect(owner.getByText("Bekleyen davetler")).toBeVisible();

  // Ayşe'nin hesabı yok: davet linkinden kayıt olur ve davete geri döner.
  const ayse = await browser.newPage();
  await ayse.goto(await linkFromEmail(ayseEmail, "/davet"));
  await expect(ayse.getByText("Yönetici").first()).toBeVisible();
  await ayse.getByRole("link", { name: "Kayıt ol" }).click();
  await ayse.getByLabel("Ad").fill("Ayşe");
  await ayse.getByLabel("E-posta").fill(ayseEmail);
  await ayse.getByLabel("Şifre").fill(PASSWORD);
  await ayse.getByRole("button", { name: "Kayıt ol" }).click();
  await expect(ayse).toHaveURL(/\/davet\?token=/);

  await ayse.getByRole("button", { name: "Ekibe katıl" }).click();
  await expect(ayse).toHaveURL(`/org/${slug}`);
  // Yönetici ayarları görür ama faturalandırmayı sadece sahip görür.
  await expect(ayse.getByRole("link", { name: "Ayarlar" })).toBeVisible();
  await expect(
    ayse.getByRole("link", { name: "Faturalandırma" }),
  ).not.toBeVisible();

  await owner.goto(`/org/${slug}/uyeler`);
  await expect(owner.getByText(ayseEmail)).toBeVisible();
  await expect(owner.getByText("Bekleyen davetler")).not.toBeVisible();
});

test("ekibin tek sahibi ekipten ayrılamaz", async ({ page }) => {
  await signUp(page, "Tek", uniqueEmail("tek"));
  const slug = await createTeam(page, "Tek Kişilik");
  await page.goto(`/org/${slug}/uyeler`);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Ekipten ayrıl" }).click();
  await expect(page.getByText("Ekibin en az bir sahibi olmalı")).toBeVisible();
});

test("üyesi olmadığın ekibin sayfaları 404 döner", async ({
  page,
  browser,
}) => {
  await signUp(page, "Sahip", uniqueEmail("sahip"));
  const slug = await createTeam(page, "Gizli Ekip");

  const stranger = await browser.newPage();
  await signUp(stranger, "Yabancı", uniqueEmail("yabanci"));
  for (const path of ["", "/uyeler", "/ayarlar", "/faturalandirma"]) {
    const response = await stranger.goto(`/org/${slug}${path}`);
    expect(response?.status(), `/org/${slug}${path}`).toBe(404);
  }
});
