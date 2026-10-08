"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { createOrganizationAction } from "@/lib/org/actions";

export function CreateOrganizationForm() {
  const [state, action] = useActionState(createOrganizationAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <Field
        label="Ekip adı"
        name="name"
        placeholder="Örn. Ali Yazılım"
        required
      />
      <SubmitButton>Oluştur</SubmitButton>
    </form>
  );
}
