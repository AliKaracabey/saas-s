"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { roleEnum } from "@/db/schema";
import type { FormState } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/current-user";
import { emailSchema, firstError } from "@/lib/auth/validation";
import { sendEmail } from "@/lib/email";
import { env } from "@/server-env";
import { requireMembership } from "./current";
import { roleLabels } from "./permissions";
import {
  acceptInvitation,
  changeRole,
  createInvitation,
  createOrganization,
  deleteOrganization,
  removeMember,
  renameOrganization,
  revokeInvitation,
} from "./service";

/*
 * Organizasyon sayfalarındaki formların server action'ları. Her action
 * yetkiyi baştan kontrol eder (requireMembership + service içindeki
 * kurallar). Butonu arayüzde gizlemek yetkilendirme değildir: server
 * action'lar herkese açık uç noktalardır ve doğrudan çağrılabilir.
 */

const nameSchema = z
  .string()
  .trim()
  .min(2, "Ad en az 2 karakter olmalı.")
  .max(60, "Ad en fazla 60 karakter olabilir.");
const roleSchema = z.enum(roleEnum.enumValues);

const errors = {
  forbidden: "Bu işlem için yetkin yok.",
  not_found: "Üye bulunamadı.",
  last_owner: "Ekibin en az bir sahibi olmalı. Önce başka birini sahip yap.",
  already_member: "Bu kişi zaten ekipte.",
  plan_limit:
    "Planının üye sınırına ulaştın. Daha fazla kişi eklemek için Pro'ya geç.",
} as const;

export async function createOrganizationAction(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireUser();
  const name = nameSchema.safeParse(form.get("name"));
  if (!name.success) return { error: firstError(name.error) };

  const org = await createOrganization(user.id, name.data);
  redirect(`/org/${org.slug}`);
}

export async function inviteMemberAction(
  slug: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { actor, user, organization } = await requireMembership(slug);
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: firstError(email.error) };
  const role = roleSchema.safeParse(form.get("role"));
  if (!role.success) return { error: "Geçersiz rol." };

  const result = await createInvitation(actor, email.data, role.data);
  if (!result.ok) return { error: errors[result.error] };

  await sendEmail({
    to: email.data,
    subject: `${user.name} seni ${organization.name} ekibine davet etti`,
    text: `${user.name} seni ${organization.name} ekibine ${roleLabels[role.data]} olarak davet etti.\n\nKatılmak için linke tıkla (7 gün geçerli):\n${env.APP_URL}/davet?token=${result.token}`,
  });
  revalidatePath(`/org/${slug}/uyeler`);
  return { message: `${email.data} adresine davet gönderildi.` };
}

export async function changeRoleAction(
  slug: string,
  targetUserId: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { actor } = await requireMembership(slug);
  const role = roleSchema.safeParse(form.get("role"));
  if (!role.success) return { error: "Geçersiz rol." };

  const result = await changeRole(actor, targetUserId, role.data);
  if (!result.ok) return { error: errors[result.error] };
  revalidatePath(`/org/${slug}`, "layout");
  return { message: "Rol güncellendi." };
}

export async function removeMemberAction(
  slug: string,
  targetUserId: string,
  _: FormState,
): Promise<FormState> {
  const { actor } = await requireMembership(slug);
  const result = await removeMember(actor, targetUserId);
  if (!result.ok) return { error: errors[result.error] };

  if (targetUserId === actor.userId) redirect("/panel");
  revalidatePath(`/org/${slug}/uyeler`);
  return { message: "Üye çıkarıldı." };
}

export async function revokeInvitationAction(
  slug: string,
  invitationId: string,
): Promise<void> {
  const { actor } = await requireMembership(slug);
  await revokeInvitation(actor, invitationId);
  revalidatePath(`/org/${slug}/uyeler`);
}

export async function renameOrganizationAction(
  slug: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { actor } = await requireMembership(slug);
  const name = nameSchema.safeParse(form.get("name"));
  if (!name.success) return { error: firstError(name.error) };

  const result = await renameOrganization(actor, name.data);
  if (!result.ok) return { error: errors[result.error] };
  revalidatePath(`/org/${slug}`, "layout");
  return { message: "Ekip adı güncellendi." };
}

export async function deleteOrganizationAction(
  slug: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { actor } = await requireMembership(slug);
  // Geri alınamayan işlemlerde kullanıcıdan adı yazmasını isteriz; yanlışlıkla
  // tıklamayı önler.
  if (form.get("confirm") !== slug) {
    return { error: `Onaylamak için "${slug}" yaz.` };
  }

  const result = await deleteOrganization(actor);
  if (!result.ok) return { error: errors[result.error] };
  redirect("/panel");
}

export async function acceptInvitationAction(
  token: string,
  _: FormState,
): Promise<FormState> {
  const { user } = await requireUser();
  const result = await acceptInvitation(token, user);
  if (!result.ok) {
    return {
      error:
        result.error === "email_mismatch"
          ? "Bu davet başka bir e-posta adresine gönderilmiş."
          : "Bu davet geçersiz, iptal edilmiş ya da süresi dolmuş.",
    };
  }
  redirect(`/org/${result.organization.slug}`);
}
