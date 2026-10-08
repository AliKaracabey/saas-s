import Link from "next/link";
import { signOut } from "@/lib/auth/actions";

export function AppHeader({
  userName,
  children,
}: {
  userName: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/panel" className="font-bold tracking-tight">
            saas-s
          </Link>
          {children}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-500">{userName}</span>
          <form action={signOut}>
            <button className="underline">Çıkış yap</button>
          </form>
        </div>
      </div>
    </header>
  );
}
