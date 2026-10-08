"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { requestPasswordReset } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field
        label="E-posta"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <SubmitButton>Link gönder</SubmitButton>
    </form>
  );
}
