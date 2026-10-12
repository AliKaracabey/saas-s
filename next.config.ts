import type { NextConfig } from "next";

/*
 * Her cevaba eklenen güvenlik başlıkları. Tarayıcıya "bu siteyi şöyle
 * korumalısın" der; bedava ve etkili bir savunma katmanı.
 */
const securityHeaders = [
  // Sitemiz başka bir sitenin içinde <iframe> ile açılamaz. Böylece biri
  // sayfamızı görünmez yapıp kullanıcıya butonlarımıza tıklatamaz
  // (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Tarayıcı dosyanın türünü tahmin etmeye çalışmaz; ne dersek o.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Başka bir siteye giden linklerde tam adresimizi (ve içindeki token'ları)
  // değil, sadece alan adımızı gönderir.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Kullanmadığımız tarayıcı özelliklerini tamamen kapatır.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Tarayıcı bu siteye 2 yıl boyunca sadece HTTPS ile bağlanır. (localhost'ta
  // HTTP kullandığımız için tarayıcılar bu başlığı orada yok sayar.)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // "X-Powered-By: Next.js" başlığını kaldırır; saldırgana bedava bilgi vermeyelim.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
