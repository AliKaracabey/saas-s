import { requireMembership } from "@/lib/org/current";
import { roleLabels } from "@/lib/org/permissions";
import { getPlan, listMembers } from "@/lib/org/service";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization, role } = await requireMembership(slug);
  const [members, plan] = await Promise.all([
    listMembers(organization.id),
    getPlan(organization.id),
  ]);

  const stats = [
    { label: "Plan", value: plan.plan === "pro" ? "Pro" : "Ücretsiz" },
    { label: "Üye sayısı", value: members.length },
    { label: "Rolün", value: roleLabels[role] },
  ];

  return (
    <>
      <h1 className="text-2xl font-semibold">{organization.name}</h1>
      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <dt className="text-sm text-neutral-500">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-neutral-500">
        Ekibin ürün özellikleri sonraki projelerde bu şablonun üzerine
        eklenecek.
      </p>
    </>
  );
}
