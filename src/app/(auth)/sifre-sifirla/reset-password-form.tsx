"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { resetPasswordAction } from "@/lib/auth/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <Field
        label="Yeni şifre"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <Field
        label="Yeni şifre (tekrar)"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <SubmitButton>Şifreyi değiştir</SubmitButton>
    </form>
  );
}
