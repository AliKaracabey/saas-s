"use client";

import { useActionState } from "react";
import type { Role } from "@/db/schema";
import { changeRoleAction, removeMemberAction } from "@/lib/org/actions";

export function MemberActions({
  slug,
  userId,
  role,
  allowOwner,
}: {
  slug: string;
  userId: string;
  role: Role;
  allowOwner: boolean;
}) {
  const [roleState, changeRole, changing] = useActionState(
    changeRoleAction.bind(null, slug, userId),
    undefined,
  );
  const [removeState, remove, removing] = useActionState(
    removeMemberAction.bind(null, slug, userId),
    undefined,
  );
  const error = roleState?.error ?? removeState?.error;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3 text-sm">
        <form action={changeRole}>
          <select
            name="role"
            defaultValue={role}
            disabled={changing}
            aria-label="Rol"
            // Seçim değişince formu hemen gönder.
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="member">Üye</option>
            <option value="admin">Yönetici</option>
            {(allowOwner || role === "owner") && (
              <option value="owner">Sahip</option>
            )}
          </select>
        </form>
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm("Bu üyeyi ekipten çıkarmak istediğine emin misin?")) {
              e.preventDefault();
            }
          }}
        >
          <button disabled={removing} className="text-red-600 underline">
            Çıkar
          </button>
        </form>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function LeaveButton({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}) {
  const [state, leave, pending] = useActionState(
    removeMemberAction.bind(null, slug, userId),
    undefined,
  );
  return (
    <form
      action={leave}
      onSubmit={(e) => {
        if (!confirm("Bu ekipten ayrılmak istediğine emin misin?")) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-1 text-sm"
    >
      <button disabled={pending} className="self-start text-red-600 underline">
        Ekipten ayrıl
      </button>
      {state?.error && <p className="text-red-600">{state.error}</p>}
    </form>
  );
}
