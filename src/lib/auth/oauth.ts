import { createHash } from "node:crypto";
import { generateToken } from "./tokens";

/*
 * OAuth 2.0 yardımcıları.
 *
 * state: Giriş başlarken üretilip çereze yazılır ve GitHub'a gönderilir.
 * GitHub geri dönünce aynı değeri yollar; çerezdekiyle eşleşmezse istek
 * bizim başlattığımız bir giriş değildir (CSRF). Saldırganın kendi GitHub
 * hesabını kurbanın tarayıcısında "bağlamasını" engeller.
 *
 * PKCE (RFC 7636): Giriş başlarken gizli bir "code_verifier" üretilir;
 * GitHub'a sadece onun SHA-256 özeti ("code_challenge") gönderilir. Kodu
 * token'a çevirirken verifier'ın kendisi yollanır. Böylece dönüş URL'sindeki
 * `code` yolda çalınsa bile verifier olmadan işe yaramaz.
 */

export const generateState = generateToken;
export const generateCodeVerifier = generateToken;

export function createCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}
