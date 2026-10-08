import { cookies, headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server-env";
import { loginWithOAuth } from "@/lib/auth/account";
import { setSessionCookie } from "@/lib/auth/cookie";
import { exchangeCode, fetchGitHubUser } from "@/lib/auth/github";
import { createSession } from "@/lib/auth/session";

// GitHub, kullanıcı izin verdikten sonra buraya `code` ve `state` ile döner.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("github_oauth_state")?.value;
  const codeVerifier = cookieStore.get("github_code_verifier")?.value;
  cookieStore.delete("github_oauth_state");
  cookieStore.delete("github_code_verifier");

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/giris?hata=${reason}`, env.APP_URL));

  // state eşleşmiyorsa bu giriş bizim tarayıcıda başlattığımız giriş değil.
  if (!code || !state || !expectedState || !codeVerifier) return fail("github");
  if (state !== expectedState) return fail("github");

  let result;
  try {
    const accessToken = await exchangeCode(code, codeVerifier);
    const profile = await fetchGitHubUser(accessToken);
    result = await loginWithOAuth({
      provider: "github",
      providerAccountId: profile.id,
      name: profile.name,
      verifiedEmail: profile.verifiedEmail,
    });
  } catch (error) {
    console.error(error);
    return fail("github");
  }

  if (!result.ok) {
    return fail(
      result.error === "email_required"
        ? "github-eposta"
        : "github-baska-hesap",
    );
  }

  const h = await headers();
  const { token, session } = await createSession(result.user.id, {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: h.get("user-agent"),
  });
  await setSessionCookie(token, session.expiresAt);

  return NextResponse.redirect(new URL("/panel", env.APP_URL));
}
