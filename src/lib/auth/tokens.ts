import { createHmac, randomBytes } from "node:crypto";

/**
 * Tahmin edilemez, URL'de güvenle kullanılabilen bir token üretir.
 * 32 bayt = 256 bit rastgelelik; kaba kuvvetle bulunması imkânsızdır.
 */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Token'ın veritabanında saklanacak özetini üretir.
 *
 * Veritabanına token'ın kendisi değil bu özet yazılır. Veritabanı sızsa bile
 * saldırgan özetten token'ı geri üretemez, dolayısıyla oturum çalamaz.
 * HMAC'e verilen gizli anahtar ("pepper") veritabanında değil ortam
 * değişkeninde durur; sadece veritabanını ele geçiren biri özetleri kendi
 * ürettiği token'larla da eşleştiremez.
 */
export function hashToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}
