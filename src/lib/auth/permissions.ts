import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Permissions = Record<string, string>;

// Rangs de niveau d'accès : aucun < lecture < validation < édition
export const PERM_RANK: Record<string, number> = { "-": 0, "L": 1, "V": 2, "E": 3 };
export const ADMIN_PERMS: Permissions = { users: "E", config: "E", comites: "E", pipeline: "E", consolide: "E", reporting: "E", portefeuille: "E", contacts: "E", documents: "E" };

export async function getMyPermissions(): Promise<{ perms: Permissions; roleName: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { perms: {}, roleName: "" };
  const { data: profile } = await supabase.from("profiles").select("role_id, roles(name, permissions)").eq("id", user.id).single();
  const role = profile?.roles as { name?: string; permissions?: Permissions } | null;
  // Sécurité : un profil sans rôle (amorçage du propriétaire) reçoit les droits admin.
  if (!role || !role.permissions) return { perms: ADMIN_PERMS, roleName: role?.name ?? "Administrateur" };
  return { perms: role.permissions, roleName: role.name ?? "" };
}

export function can(perms: Permissions, domain: string, min: string = "L"): boolean {
  return (PERM_RANK[perms?.[domain] ?? "-"] ?? 0) >= (PERM_RANK[min] ?? 1);
}

/** À utiliser en tête d'une page serveur : redirige vers le tableau de bord si l'accès est refusé. */
export async function requirePerm(domain: string, min: string = "L"): Promise<void> {
  const { perms } = await getMyPermissions();
  if (!can(perms, domain, min)) redirect("/dashboard");
}
