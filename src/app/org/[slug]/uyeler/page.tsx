import { revokeInvitationAction } from "@/lib/org/actions";
import { requireMembership } from "@/lib/org/current";
import { can, canManageMember, roleLabels } from "@/lib/org/permissions";
import { listMembers, listPendingInvitations } from "@/lib/org/service";
import { InviteForm } from "./invite-form";
import { LeaveButton, MemberActions } from "./member-actions";

export const metadata = { title: "Üyeler · saas-s" };

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { organization, role, user } = await requireMembership(slug);
  const canInvite = can(role, "member:invite");
  const [members, pending] = await Promise.all([
    listMembers(organization.id),
    canInvite ? listPendingInvitations(organization.id) : [],
  ]);

  return (
    <>
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Üyeler</h1>
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {members.map((m) => {
            const isMe = m.userId === user.id;
            return (
              <li
                key={m.userId}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {m.name}{" "}
                    {isMe && <span className="text-neutral-500">(sen)</span>}
                  </span>
                  <span className="text-sm text-neutral-500">{m.email}</span>
                </div>
                {!isMe && canManageMember(role, m.role) ? (
                  <MemberActions
                    slug={slug}
                    userId={m.userId}
                    role={m.role}
                    allowOwner={role === "owner"}
                  />
                ) : (
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {roleLabels[m.role]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <LeaveButton slug={slug} userId={user.id} />
      </section>

      {canInvite && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Davet et</h2>
          <InviteForm slug={slug} allowOwner={role === "owner"} />

          {pending.length > 0 && (
            <>
              <h3 className="mt-4 font-medium">Bekleyen davetler</h3>
              <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
                {pending.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <span>
                      {inv.email} · {roleLabels[inv.role]} ·{" "}
                      <span className="text-neutral-500">
                        {inv.expiresAt.toLocaleDateString("tr-TR")} tarihine
                        kadar
                      </span>
                    </span>
                    <form
                      action={revokeInvitationAction.bind(null, slug, inv.id)}
                    >
                      <button className="text-red-600 underline">
                        İptal et
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}
