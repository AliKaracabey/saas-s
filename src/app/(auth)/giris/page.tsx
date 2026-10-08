import Link from "next/link";
import { isGitHubConfigured } from "@/lib/auth/github";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Giriş yap · saas-s" };

const errors: Record<string, string> = {
  github: "GitHub ile giriş tamamlanamadı. Tekrar dene.",
  "github-eposta":
    "GitHub hesabında doğrulanmış bir birincil e-posta yok. GitHub ayarlarından e-postanı doğrulayıp tekrar dene.",
  "github-baska-hesap":
    "Bu e-postayla kayıtlı hesaba başka bir GitHub hesabı bağlı. O hesapla ya da şifrenle giriş yap.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;
  const error = hata ? errors[hata] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Giriş yap</h1>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {isGitHubConfigured() && (
        <>
          {/* Route handler'a tam sayfa yönlendirme gerekir; <Link> değil <a>. */}
          <a
            href="/giris/github"
            className="flex items-center justify-center gap-2 rounded-md border border-neutral-300 px-4 py-2 font-medium transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            GitHub ile giriş yap
          </a>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            veya
            <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </>
      )}
      <SignInForm />
      <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
        <Link href="/sifremi-unuttum" className="underline">
          Şifremi unuttum
        </Link>
        <Link href="/kayit" className="font-medium underline">
          Kayıt ol
        </Link>
      </div>
    </div>
  );
}
