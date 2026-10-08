import { hash, verify } from "@node-rs/argon2";

/*
 * Şifreler Argon2id ile özetlenir. Argon2 bilerek yavaş ve bellek tüketen bir
 * algoritmadır: bir saldırgan veritabanını ele geçirse bile her şifre denemesi
 * pahalıya patlar. Parametreler OWASP'ın önerdiği değerlerdir
 * (19 MiB bellek, 2 tur, 1 iş parçacığı).
 */
const options = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // Bozuk bir özet hata fırlatır; bunu "şifre yanlış" olarak ele alırız.
    return false;
  }
}

// Kullanıcı bulunamadığında da bir doğrulama çalıştırmak için sabit bir özet.
// Böylece "bu e-posta kayıtlı mı?" sorusu cevap süresinden anlaşılamaz.
let dummyHash: Promise<string> | undefined;
export async function verifyDummyPassword(password: string): Promise<void> {
  dummyHash ??= hashPassword("zamanlama-saldirilarina-karsi");
  await verifyPassword(await dummyHash, password);
}
