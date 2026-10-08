import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/current-user";

export default async function Home() {
  const { user } = await getCurrentSession();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">saas-s</h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-400">
        Kimlik doğrulama, ekipler, roller ve abonelik içeren SaaS başlangıç
        şablonu. Adım adım geliştiriliyor.
      </p>
      <div className="flex gap-3">
        {user ? (
          <Link
            href="/panel"
            className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Panele git
          </Link>
        ) : (
          <>
            <Link
              href="/kayit"
              className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              Kayıt ol
            </Link>
            <Link
              href="/giris"
              className="rounded-md border border-neutral-300 px-4 py-2 font-medium dark:border-neutral-700"
            >
              Giriş yap
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
