import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/form";
import {
  openBillingPortalAction,
  startCheckoutAction,
} from "@/lib/billing/actions";
import { planLabels, planLimits, statusLabels } from "@/lib/billing/plans";
import { getSubscription } from "@/lib/billing/service";
import { billing } from "@/lib/billing/stripe";
import { requireMembership } from "@/lib/org/current";
import { can } from "@/lib/org/permissions";
import { getSeatUsage } from "@/lib/org/service";

export const metadata = { title: "Faturalandırma · saas-s" };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" });

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ odeme?: string }>;
}) {
  const { slug } = await params;
  const { odeme } = await searchParams;
  const { organization, role } = await requireMembership(slug);
  if (!can(role, "billing:manage")) notFound();

  const [subscription, seats] = await Promise.all([
    getSubscription(organization.id),
    getSeatUsage(organization.id),
  ]);
  const plan = subscription?.plan ?? "free";
  const isPro = plan === "pro";

  return (
    <>
      <h1 className="text-2xl font-semibold">Faturalandırma</h1>

      {odeme === "basarili" && (
        <p
          role="status"
          className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300"
        >
          Ödeme alındı. Stripe onayı birkaç saniye içinde gelir; plan hâlâ
          Ücretsiz görünüyorsa sayfayı yenile.
        </p>
      )}
      {odeme === "iptal" && (
        <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900">
          Ödeme iptal edildi, hiçbir ücret alınmadı.
        </p>
      )}

      <section className="flex max-w-md flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-neutral-500">Plan</dt>
          <dd className="font-semibold">{planLabels[plan]}</dd>

          <dt className="text-neutral-500">Üye + bekleyen davet</dt>
          <dd>
            {seats} / {planLimits[plan].members}
          </dd>

          {subscription?.stripeSubscriptionId && (
            <>
              <dt className="text-neutral-500">Durum</dt>
              <dd>{statusLabels[subscription.status]}</dd>
            </>
          )}

          {isPro && subscription?.currentPeriodEnd && (
            <>
              <dt className="text-neutral-500">
                {subscription.cancelAtPeriodEnd ? "Bitiş" : "Yenilenme"}
              </dt>
              <dd>{dateFormat.format(subscription.currentPeriodEnd)}</dd>
            </>
          )}
        </dl>

        {isPro && subscription?.cancelAtPeriodEnd && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Abonelik iptal edildi. Dönem sonuna kadar Pro özellikleri devam
            eder, sonra Ücretsiz plana dönülür.
          </p>
        )}
        {subscription?.status === "past_due" && (
          <p className="text-sm text-red-700 dark:text-red-400">
            Son ödeme alınamadı. Stripe tekrar deneyecek; kartını portaldan
            güncelleyebilirsin.
          </p>
        )}

        {!billing ? (
          <p className="text-sm text-neutral-500">
            Ödeme sistemi bu sunucuda ayarlanmamış (STRIPE_* ortam
            değişkenleri). Bkz. docs/notlar/1.5-abonelik-ve-odeme.md
          </p>
        ) : (
          <div className="flex gap-3">
            {!isPro && (
              <form action={startCheckoutAction.bind(null, slug)}>
                <SubmitButton>Pro&apos;ya geç</SubmitButton>
              </form>
            )}
            {subscription?.stripeCustomerId && (
              <form action={openBillingPortalAction.bind(null, slug)}>
                <SubmitButton>Aboneliği yönet</SubmitButton>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="grid max-w-2xl gap-4 sm:grid-cols-2">
        {(["free", "pro"] as const).map((p) => (
          <div
            key={p}
            className={`rounded-lg border p-4 ${p === plan ? "border-neutral-900 dark:border-neutral-100" : "border-neutral-200 dark:border-neutral-800"}`}
          >
            <h2 className="font-semibold">{planLabels[p]}</h2>
            <p className="mt-1 text-sm text-neutral-500">
              En fazla {planLimits[p].members} üye
            </p>
          </div>
        ))}
      </section>
    </>
  );
}
