import { expect, test } from "@playwright/test";
import {
  linkFromEmail,
  PASSWORD,
  signIn,
  signOut,
  signUp,
  uniqueEmail,
} from "./helpers";

test("kayıt olur, e-postasını doğrular, çıkış yapıp tekrar girer", async ({
  page,
}) => {
  const email = uniqueEmail("ali");
  await signUp(page, "Ali", email);
  await expect(page.getByText("Merhaba, Ali")).toBeVisible();
  await expect(page.getByText("gönderdiğimiz linkle")).toBeVisible();

  // Oturum çerezi JavaScript'ten okunamamalı (XSS'e karşı).
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "session",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");

  await page.goto(await linkFromEmail(email, "/email-dogrula"));
  await expect(page.getByText("E-posta adresin doğrulandı.")).toBeVisible();

  await signOut(page);
  await page.goto("/panel");
  await expect(page).toHaveURL("/giris");

  await signIn(page, email, "yanlis-sifre");
  await expect(page.getByText("E-posta veya şifre hatalı.")).toBeVisible();

  await signIn(page, email);
  await expect(page).toHaveURL("/panel");
});

test("aynı e-postayla ikinci kez kayıt olunamaz", async ({ page }) => {
  const email = uniqueEmail("ayni");
  await signUp(page, "İlk", email);
  await signOut(page);

  await page.goto("/kayit");
  await page.getByLabel("Ad").fill("İkinci");
  // Büyük harfle yazılsa bile aynı adres sayılır.
  await page.getByLabel("E-posta").fill(email.toUpperCase());
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Kayıt ol" }).click();
  await expect(page.getByText("zaten var")).toBeVisible();
});

test("şifresini unutan kullanıcı e-postadaki linkle yeni şifre belirler", async ({
  page,
  browser,
}) => {
  const email = uniqueEmail("unutkan");
  await signUp(page, "Unutkan", email);

  // Başka bir cihazda açık kalmış oturum: şifre değişince kapanmalı.
  const otherDevice = await browser.newPage();
  await signIn(otherDevice, email);
  await expect(otherDevice).toHaveURL("/panel");

  await signOut(page);
  await page.goto("/sifremi-unuttum");
  await page.getByLabel("E-posta").fill(email);
  await page.getByRole("button", { name: "Link gönder" }).click();
  await expect(
    page.getByText("şifre sıfırlama linkini gönderdik"),
  ).toBeVisible();

  await page.goto(await linkFromEmail(email, "/sifre-sifirla"));
  await page.getByLabel("Yeni şifre", { exact: true }).fill("yepyeni-sifre");
  await page.getByLabel("Yeni şifre (tekrar)").fill("yepyeni-sifre");
  await page.getByRole("button", { name: "Şifreyi değiştir" }).click();
  await expect(page).toHaveURL("/panel");

  await otherDevice.goto("/panel");
  await expect(otherDevice).toHaveURL("/giris");

  await signOut(page);
  await signIn(page, email);
  await expect(page.getByText("E-posta veya şifre hatalı.")).toBeVisible();
  await signIn(page, email, "yepyeni-sifre");
  await expect(page).toHaveURL("/panel");
});

test("giriş sonrası yönlendirme başka bir siteye gidemez", async ({ page }) => {
  const email = uniqueEmail("yonlendirme");
  await signUp(page, "Yön", email);
  await signOut(page);

  await page.goto("/giris?sonra=https://kotu-site.com");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL("/panel");
});
