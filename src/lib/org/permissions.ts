import type { Role } from "@/db/schema";

/*
 * Rol tabanlı yetkilendirme (RBAC). "Kim ne yapabilir?" sorusunun cevabı tek
 * bir tabloda durur; kodun içine dağılmış `if (role === "admin")` kontrolleri
 * yerine her yer `can(role, "member:invite")` sorar. Yeni bir yetki eklemek
 * ya da bir rolün yetkisini değiştirmek tek satırlık bir değişikliktir.
 */

export const permissions = {
  "org:update": ["owner", "admin"],
  "org:delete": ["owner"],
  "billing:manage": ["owner"],
  "member:invite": ["owner", "admin"],
  "member:remove": ["owner", "admin"],
  "member:change_role": ["owner", "admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof permissions;

export function can(role: Role, permission: Permission): boolean {
  return (permissions[permission] as readonly Role[]).includes(role);
}

/**
 * Bir üyenin rolünü değiştirme veya onu çıkarma kuralı: owner'lara sadece
 * owner dokunabilir, owner rolünü de sadece owner verebilir. Böylece bir
 * admin kendini ya da başkasını owner yapıp ekibi ele geçiremez.
 */
export function canManageMember(
  actorRole: Role,
  targetRole: Role,
  newRole?: Role,
): boolean {
  if (targetRole === "owner" || newRole === "owner") {
    return actorRole === "owner";
  }
  return can(actorRole, "member:change_role");
}

export const roleLabels: Record<Role, string> = {
  owner: "Sahip",
  admin: "Yönetici",
  member: "Üye",
};
