import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireMembership } from "@/lib/org/current";
import { can } from "@/lib/org/permissions";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user, organization, role } = await requireMembership(slug);

  const tabs = [
    { href: `/org/${slug}`, label: "Genel" },
    { href: `/org/${slug}/uyeler`, label: "Üyeler" },
    ...(can(role, "org:update")
      ? [{ href: `/org/${slug}/ayarlar`, label: "Ayarlar" }]
      : []),
    ...(can(role, "billing:manage")
      ? [{ href: `/org/${slug}/faturalandirma`, label: "Faturalandırma" }]
      : []),
  ];

  return (
    <>
      <AppHeader userName={user.name}>
        <span className="text-neutral-300 dark:text-neutral-700">/</span>
        <span className="font-medium">{organization.name}</span>
      </AppHeader>
      <nav className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-4xl gap-6 px-6 text-sm">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="py-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
        {children}
      </main>
    </>
  );
}
