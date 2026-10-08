import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/org/current";
import { can } from "@/lib/org/permissions";
import { DeleteOrganizationForm, RenameForm } from "./settings-forms";

export const metadata = { title: "Ayarlar · saas-s" };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization, role } = await requireMembership(slug);
  if (!can(role, "org:update")) notFound();

  return (
    <>
      <section className="flex max-w-md flex-col gap-3">
        <h1 className="text-2xl font-semibold">Ayarlar</h1>
        <RenameForm slug={slug} name={organization.name} />
      </section>

      {can(role, "org:delete") && (
        <section className="flex max-w-md flex-col gap-3 rounded-lg border border-red-200 p-4 dark:border-red-900">
          <h2 className="font-semibold text-red-700 dark:text-red-400">
            Ekibi sil
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Ekip, tüm üyelikler, davetler ve abonelik kalıcı olarak silinir. Bu
            işlem geri alınamaz.
          </p>
          <DeleteOrganizationForm slug={slug} />
        </section>
      )}
    </>
  );
}
