import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/lib/auth/current-user";
import { getMembership, type Actor } from "./service";

/**
 * URL'deki slug'a göre organizasyonu ve kullanıcının oradaki rolünü bulur.
 * Kullanıcı üye değilse 404 döner. 403 ("yetkin yok") değil 404 ("böyle bir
 * sayfa yok") dönmemizin nedeni, üye olmayanlara o ekibin var olup
 * olmadığını bile söylememek.
 */
export const requireMembership = cache(async (slug: string) => {
  const { user } = await requireUser();
  const membership = await getMembership(user.id, slug);
  if (!membership) notFound();

  const actor: Actor = {
    userId: user.id,
    organizationId: membership.organization.id,
    role: membership.role,
  };
  return {
    user,
    organization: membership.organization,
    role: membership.role,
    actor,
  };
});
