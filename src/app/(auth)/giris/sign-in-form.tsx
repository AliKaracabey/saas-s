"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { signIn } from "@/lib/auth/actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field
        label="E-posta"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Field
        label="Şifre"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton>Giriş yap</SubmitButton>
    </form>
  );
}
