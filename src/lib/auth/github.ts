import "server-only";
import { env } from "@/server-env";

/*
 * GitHub OAuth 2.0 istemcisi. Akış:
 * 1. Kullanıcıyı GitHub'ın izin sayfasına yönlendir (createAuthorizationUrl).
 * 2. GitHub, kullanıcı izin verince bizim callback adresimize `code` ile döner.
 * 3. Bu kodu GitHub'a gönderip bir erişim token'ı al (exchangeCode).
 * 4. Token ile kullanıcının profilini ve e-postalarını oku (fetchGitHubUser).
 */

export const GITHUB_CALLBACK_PATH = "/giris/github/callback";

export function isGitHubConfigured(): boolean {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

export function createAuthorizationUrl(
  state: string,
  codeChallenge: string,
): URL {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", env.APP_URL + GITHUB_CALLBACK_PATH);
  // Sadece ihtiyacımız olan izinleri isteriz: profil ve e-posta adresleri.
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      // Client secret sadece sunucuda kullanılır, tarayıcı asla görmez.
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier: codeVerifier,
      redirect_uri: env.APP_URL + GITHUB_CALLBACK_PATH,
    }),
  });
  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(`GitHub token alınamadı: ${data.error ?? response.status}`);
  }
  return data.access_token;
}

export type GitHubProfile = {
  id: string;
  login: string;
  name: string;
  /** GitHub'ın doğruladığı birincil e-posta; yoksa null. */
  verifiedEmail: string | null;
};

type GitHubEmail = { email: string; primary: boolean; verified: boolean };

export async function fetchGitHubUser(
  accessToken: string,
): Promise<GitHubProfile> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "saas-s",
  };
  const [userResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", { headers }),
    fetch("https://api.github.com/user/emails", { headers }),
  ]);
  if (!userResponse.ok || !emailsResponse.ok) {
    throw new Error("GitHub profili okunamadı");
  }

  const user = (await userResponse.json()) as {
    id: number;
    login: string;
    name: string | null;
  };
  const emails = (await emailsResponse.json()) as GitHubEmail[];

  return {
    id: String(user.id),
    login: user.login,
    name: user.name || user.login,
    verifiedEmail: pickVerifiedEmail(emails),
  };
}

/**
 * Sadece GitHub'ın doğruladığı birincil e-postayı kabul ederiz. Doğrulanmamış
 * bir adrese güvenseydik, biri GitHub'a başkasının e-postasını ekleyip o
 * kişinin hesabına girebilirdi.
 */
export function pickVerifiedEmail(emails: GitHubEmail[]): string | null {
  const primary = emails.find((e) => e.primary && e.verified);
  return primary?.email.toLowerCase() ?? null;
}
