import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/server-env";
import { createAuthorizationUrl, isGitHubConfigured } from "@/lib/auth/github";
import {
  createCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/auth/oauth";

// "GitHub ile giriş yap" butonu buraya gelir; kullanıcıyı GitHub'a yönlendirir.
export async function GET() {
  if (!isGitHubConfigured()) {
    return NextResponse.redirect(new URL("/giris", env.APP_URL));
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  // İkisi de dönüşte kontrol edilmek üzere kısa ömürlü çerezlere yazılır.
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
  cookieStore.set("github_oauth_state", state, options);
  cookieStore.set("github_code_verifier", codeVerifier, options);

  return NextResponse.redirect(
    createAuthorizationUrl(state, createCodeChallenge(codeVerifier)),
  );
}
