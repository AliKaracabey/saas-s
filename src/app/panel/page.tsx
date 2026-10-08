import { requireUser } from "@/lib/auth/current-user";
import { signOut } from "@/lib/auth/actions";
import { ResendVerification } from "./resend-verification";

export const metadata = { title: "Panel · saas-s" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dogrulama?: string }>;
}) {
  const { user } = await requireUser();
  const { dogrulama } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Merhaba, {user.name}</h1>
        <form action={signOut}>
          <button className="text-sm underline">Çıkış yap</button>
        </form>
      </header>

      {dogrulama === "basarili" && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
          E-posta adresin doğrulandı.
        </p>
      )}
      {dogrulama === "gecersiz" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Doğrulama linki geçersiz veya süresi dolmuş.
        </p>
      )}
      {!user.emailVerifiedAt && <ResendVerification email={user.email} />}

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-neutral-500">E-posta</dt>
        <dd>{user.email}</dd>
        <dt className="text-neutral-500">Üyelik tarihi</dt>
        <dd>{user.createdAt.toLocaleDateString("tr-TR")}</dd>
      </dl>
    </main>
  );
}
