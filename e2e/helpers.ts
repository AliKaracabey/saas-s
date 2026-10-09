import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";
import { OUTBOX_FILE } from "./env";

export const PASSWORD = "cok-gizli-1";

/** Her test kendi kullanıcısını açar; e-posta adresleri asla çakışmaz. */
export function uniqueEmail(name: string) {
  return `${name}-${randomUUID().slice(0, 8)}@ornek.com`;
}

type OutboxEmail = { to: string; subject: string; text: string };

/**
 * Bu adrese gönderilmiş son e-postadaki, verilen yola giden linki bulur.
 * E-posta sunucuda arka planda yazıldığı için birkaç kez bakarız
 * (expect.poll) ve bulamazsak test anlamlı bir mesajla düşer.
 */
export async function linkFromEmail(to: string, path: string) {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const emails = await readOutbox();
        const text = emails.findLast((e) => e.to === to.toLowerCase())?.text;
        link = text?.match(new RegExp(`https?://\\S+${path}\\?\\S+`))?.[0];
        return link;
      },
      { message: `${to} adresine ${path} linki gelmedi` },
    )
    .toBeTruthy();
  return link!;
}

async function readOutbox(): Promise<OutboxEmail[]> {
  const content = await readFile(OUTBOX_FILE, "utf8").catch(() => "");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as OutboxEmail);
}

export async function signUp(page: Page, name: string, email: string) {
  await page.goto("/kayit");
  await page.getByLabel("Ad").fill(name);
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Kayıt ol" }).click();
  await expect(page).toHaveURL("/panel");
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL("/giris");
}

/** Panelden yeni bir ekip açar ve ekibin slug'ını döner. */
export async function createTeam(page: Page, name: string) {
  await page.goto("/panel");
  await page.getByLabel("Ekip adı").fill(name);
  await page.getByRole("button", { name: "Oluştur", exact: true }).click();
  await expect(page).toHaveURL(/\/org\/[\w-]+$/);
  return new URL(page.url()).pathname.split("/")[2]!;
}

export async function invite(
  page: Page,
  slug: string,
  email: string,
  role: "member" | "admin" = "member",
) {
  await page.goto(`/org/${slug}/uyeler`);
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Rol").selectOption(role);
  await page.getByRole("button", { name: "Davet gönder" }).click();
}
