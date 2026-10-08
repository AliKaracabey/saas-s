import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth/current-user";
import { roleLabels } from "@/lib/org/permissions";
import { listUserOrganizations } from "@/lib/org/service";
import { CreateOrganizationForm } from "./create-organization-form";
import { ResendVerification } from "./resend-verification";

export const metadata = { title: "Panel · saas-s" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dogrulama?: string }>;
}) {
  const { user } = await requireUser();
  const { dogrulama } = await searchParams;
  const organizations = await listUserOrganizations(user.id);

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
        <h1 className="text-2xl font-semibold">Merhaba, {user.name}</h1>

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

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Ekiplerin</h2>
          {organizations.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Henüz bir ekibin yok. Aşağıdan ilk ekibini oluştur ya da bir davet
              linkiyle mevcut bir ekibe katıl.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {organizations.map(({ organization, role }) => (
                <li key={organization.id}>
                  <Link
                    href={`/org/${organization.slug}`}
                    className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                  >
                    <span className="font-medium">{organization.name}</span>
                    <span className="text-sm text-neutral-500">
                      {roleLabels[role]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex max-w-sm flex-col gap-3">
          <h2 className="text-lg font-semibold">Yeni ekip oluştur</h2>
          <CreateOrganizationForm />
        </section>
      </main>
    </>
  );
}
