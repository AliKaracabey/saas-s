import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE } from "./cookie";
import { validateSessionToken } from "./session";

/**
 * İsteği yapan kullanıcının oturumunu döndürür. React'in `cache` fonksiyonu
 * sayesinde aynı istek içinde kaç kez çağrılırsa çağrılsın veritabanına bir
 * kez gidilir.
 */
export const getCurrentSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { session: null, user: null };
  return validateSessionToken(token);
});

/** Giriş yapılmamışsa giriş sayfasına yönlendirir. */
export async function requireUser() {
  const { session, user } = await getCurrentSession();
  if (!session) redirect("/giris");
  return { session, user };
}
