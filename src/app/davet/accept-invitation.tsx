"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { acceptInvitationAction } from "@/lib/org/actions";

export function AcceptInvitation({ token }: { token: string }) {
  const [state, action] = useActionState(
    acceptInvitationAction.bind(null, token),
    undefined,
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <SubmitButton>Ekibe katıl</SubmitButton>
    </form>
  );
}
