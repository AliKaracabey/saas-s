"use client";

import { useActionState } from "react";
import { Field, FormMessage, Select, SubmitButton } from "@/components/form";
import { inviteMemberAction } from "@/lib/org/actions";

export function InviteForm({
  slug,
  allowOwner,
}: {
  slug: string;
  allowOwner: boolean;
}) {
  // bind ile slug'ı action'a sabitliyoruz; form sadece e-posta ve rol gönderir.
  const [state, action] = useActionState(
    inviteMemberAction.bind(null, slug),
    undefined,
  );
  return (
    <form action={action} className="flex max-w-md flex-col gap-3">
      <FormMessage state={state} />
      <Field label="E-posta" name="email" type="email" required />
      <Select label="Rol" name="role" defaultValue="member">
        <option value="member">Üye</option>
        <option value="admin">Yönetici</option>
        {allowOwner && <option value="owner">Sahip</option>}
      </Select>
      <SubmitButton>Davet gönder</SubmitButton>
    </form>
  );
}
