import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/current-user";

// Giriş yapmış kullanıcı kayıt/giriş sayfalarını görmez, panele gider.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await getCurrentSession();
  if (session) redirect("/panel");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Link href="/" className="text-xl font-bold tracking-tight">
        saas-s
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 p-6 shadow-sm dark:border-neutral-800">
        {children}
      </div>
    </main>
  );
}
