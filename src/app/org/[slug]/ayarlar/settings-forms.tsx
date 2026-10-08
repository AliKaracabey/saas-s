"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import {
  deleteOrganizationAction,
  renameOrganizationAction,
} from "@/lib/org/actions";

export function RenameForm({ slug, name }: { slug: string; name: string }) {
  const [state, action] = useActionState(
    renameOrganizationAction.bind(null, slug),
    undefined,
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <Field label="Ekip adı" name="name" defaultValue={name} required />
      <SubmitButton>Kaydet</SubmitButton>
    </form>
  );
}

export function DeleteOrganizationForm({ slug }: { slug: string }) {
  const [state, action] = useActionState(
    deleteOrganizationAction.bind(null, slug),
    undefined,
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <Field
        label={`Onaylamak için "${slug}" yaz`}
        name="confirm"
        autoComplete="off"
        required
      />
      <button className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700">
        Ekibi kalıcı olarak sil
      </button>
    </form>
  );
}
