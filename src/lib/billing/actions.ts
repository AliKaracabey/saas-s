"use server";

import { notFound, redirect } from "next/navigation";
import { requireMembership } from "@/lib/org/current";
import { can } from "@/lib/org/permissions";
import { env } from "@/server-env";
import { ensureStripeCustomer, getSubscription } from "./service";
import { billing } from "./stripe";

/*
 * Ödeme sayfasını biz yapmıyoruz. Kart bilgisi hiçbir zaman bizim
 * sunucumuza gelmiyor: kullanıcıyı Stripe'ın barındırdığı sayfalara
 * yönlendiriyoruz.
 *
 * - Checkout: Pro'ya geçiş (kart bilgisi, ödeme, 3D Secure).
 * - Customer Portal: kartı değiştirme, faturaları görme, iptal.
 *
 * Kullanıcı Checkout'u bitirip geri döndüğünde planı biz değiştirmiyoruz;
 * bunu Stripe'ın webhook'u yapıyor (bkz. service.ts).
 */

async function requireBillingManager(slug: string) {
  const membership = await requireMembership(slug);
  if (!can(membership.role, "billing:manage")) notFound();
  if (!billing) redirect(`/org/${slug}/faturalandirma`);
  return { ...membership, billing };
}

function billingUrl(slug: string, query = "") {
  return `${env.APP_URL}/org/${slug}/faturalandirma${query}`;
}

export async function startCheckoutAction(slug: string) {
  const { user, organization, billing } = await requireBillingManager(slug);

  // Zaten Pro ise ikinci bir abonelik açmak yerine portala gönder.
  const current = await getSubscription(organization.id);
  if (current?.plan === "pro") return openBillingPortalAction(slug);

  const customerId = await ensureStripeCustomer(organization.id, async () => {
    const customer = await billing.stripe.customers.create({
      name: organization.name,
      email: user.email,
      metadata: { organizationId: organization.id },
    });
    return customer.id;
  });

  const session = await billing.stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: billing.pricePro, quantity: 1 }],
    client_reference_id: organization.id,
    // Webhook'ta aboneliğin hangi ekibe ait olduğunu bu metadata'dan buluruz.
    subscription_data: { metadata: { organizationId: organization.id } },
    success_url: billingUrl(slug, "?odeme=basarili"),
    cancel_url: billingUrl(slug, "?odeme=iptal"),
  });
  if (!session.url) throw new Error("Stripe Checkout adresi dönmedi");
  redirect(session.url);
}

export async function openBillingPortalAction(slug: string) {
  const { organization, billing } = await requireBillingManager(slug);

  const current = await getSubscription(organization.id);
  if (!current?.stripeCustomerId) redirect(billingUrl(slug));

  const session = await billing.stripe.billingPortal.sessions.create({
    customer: current.stripeCustomerId,
    return_url: billingUrl(slug),
  });
  redirect(session.url);
}
