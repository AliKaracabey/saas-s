"use client";

import { useActionState } from "react";
import { resendVerification } from "@/lib/auth/actions";

export function ResendVerification({ email }: { email: string }) {
  const [state, action, pending] = useActionState(
    resendVerification,
    undefined,
  );
  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <span>
        {state?.message ??
          `${email} adresine gönderdiğimiz linkle e-postanı doğrula.`}
      </span>
      {!state?.message && (
        <button disabled={pending} className="font-medium underline">
          Tekrar gönder
        </button>
      )}
    </form>
  );
}
