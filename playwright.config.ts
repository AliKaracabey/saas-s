import { defineConfig, devices } from "@playwright/test";
import { E2E_URL, serverEnv } from "./e2e/env";

/*
 * Uçtan uca (end-to-end) testler: gerçek bir tarayıcı, gerçek bir sunucu,
 * gerçek bir veritabanı. Kullanıcının yaptığı gibi tıklar, yazar ve
 * sonucu ekranda arar. `npm run test:e2e`
 *
 * CI'da uygulama önce derlenir (`npm run build`) ve `next start` ile
 * çalıştırılır; bilgisayarında ise `next dev` yeterli.
 */
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  // CI'da yanlışlıkla bırakılmış `test.only` tüm testleri susturmasın.
  forbidOnly: isCI,
  // Bir test CI'da bir kez daha denenir; tekrar da başarısızsa gerçek hatadır.
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: E2E_URL,
    locale: "tr-TR",
    // Başarısız testin adım adım kaydı: `npx playwright show-trace <dosya>`
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Tarayıcı başka bir yere kuruluysa (ör. kendi bilgisayarındaki
        // Chrome) yolunu bu değişkenle verebilirsin.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: isCI ? "npm run start" : "npm run dev",
    url: E2E_URL,
    env: serverEnv,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
