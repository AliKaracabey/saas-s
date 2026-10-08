import "server-only";
import { cookies } from "next/headers";
import { env } from "@/server-env";

export const SESSION_COOKIE = "session";

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    // JavaScript çereze erişemez; bir XSS açığı olsa bile token çalınamaz.
    httpOnly: true,
    // Canlıda çerez sadece HTTPS üzerinden gönderilir. Yerelde http
    // kullandığımız için geliştirme ortamında kapalı.
    secure: env.NODE_ENV === "production",
    // Başka sitelerden gelen POST isteklerine çerez eklenmez (CSRF'e karşı).
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
