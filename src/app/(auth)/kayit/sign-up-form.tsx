"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { signUp } from "@/lib/auth/actions";

export function SignUpForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signUp, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Ad" name="name" autoComplete="name" required />
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
        autoComplete="new-password"
        minLength={8}
        required
      />
      <SubmitButton>Kayıt ol</SubmitButton>
    </form>
  );
}
