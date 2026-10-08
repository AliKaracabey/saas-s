import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/current-user";
import { roleLabels } from "@/lib/org/permissions";
import { getInvitation } from "@/lib/org/service";
import { AcceptInvitation } from "./accept-invitation";

export const metadata = { title: "Davet · saas-s" };

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const invitation = token ? await getInvitation(token) : null;
  const { user } = await getCurrentSession();

  let content: React.ReactNode;
  if (!token || !invitation) {
    content = (
      <>
        <h1 className="text-2xl font-semibold">Davet geçersiz</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Bu davet iptal edilmiş, kullanılmış ya da süresi dolmuş olabilir. Seni
          davet eden kişiden yeni bir link iste.
        </p>
      </>
    );
  } else {
    const next = `/davet?token=${encodeURIComponent(token)}`;
    content = (
      <>
        <h1 className="text-2xl font-semibold">
          {invitation.organization.name}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {invitation.inviterName ?? "Bir ekip üyesi"} seni bu ekibe{" "}
          <strong>{roleLabels[invitation.role]}</strong> olarak davet etti.
        </p>
        {user ? (
          <AcceptInvitation token={token} />
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p>
              Katılmak için <strong>{invitation.email}</strong> adresiyle giriş
              yap ya da kayıt ol.
            </p>
            <div className="flex gap-3">
              <Link
                href={`/giris?sonra=${encodeURIComponent(next)}`}
                className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                Giriş yap
              </Link>
              <Link
                href={`/kayit?sonra=${encodeURIComponent(next)}`}
                className="rounded-md border border-neutral-300 px-4 py-2 font-medium dark:border-neutral-700"
              >
                Kayıt ol
              </Link>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-neutral-200 p-6 shadow-sm dark:border-neutral-800">
        {content}
      </div>
    </main>
  );
}
