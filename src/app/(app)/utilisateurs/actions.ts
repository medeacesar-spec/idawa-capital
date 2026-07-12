"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = host.includes("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}`;
}

// Seuls l'Administrateur et la Direction peuvent gérer les utilisateurs.
async function assertAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("roles(name)").eq("id", user.id).single();
  const role = (data?.roles as { name?: string } | null)?.name ?? "";
  return role === "Administrateur" || role === "Associé / Direction";
}

export async function inviteUser(email: string, roleId: string, fullName: string) {
  if (!(await assertAdmin())) return { error: "Accès réservé à la direction." };
  const admin = createAdminClient();
  const origin = await siteOrigin();
  // Crée le compte (sans mot de passe utilisable) ET génère un lien d'invitation.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: email.trim(),
    options: { data: { full_name: fullName }, redirectTo: `${origin}/reinitialiser` },
  });
  if (error) return { error: error.message };
  const userId = data.user?.id;
  if (userId && roleId) {
    await admin.from("profiles").update({ role_id: roleId, full_name: fullName, email: email.trim() }).eq("id", userId);
  }
  const inviteLink = `${origin}/auth/confirm?token_hash=${data.properties?.hashed_token}&type=invite&next=/reinitialiser`;
  revalidatePath("/utilisateurs");
  return { ok: true, inviteLink };
}

const PERM_DOMAINS = ["pipeline", "portefeuille", "comites", "reporting", "consolide", "partenaires", "config", "users"];
const PERM_LEVELS = ["-", "L", "V", "E"];

export async function setRolePermission(roleId: string, domain: string, level: string) {
  if (!(await assertAdmin())) return { error: "Accès réservé à la direction." };
  if (!PERM_DOMAINS.includes(domain) || !PERM_LEVELS.includes(level)) return { error: "Valeur invalide." };
  const admin = createAdminClient();
  const { data: role } = await admin.from("roles").select("name, permissions").eq("id", roleId).single();
  if (!role) return { error: "Rôle introuvable." };
  // Garde-fou : ne pas retirer l'accès Utilisateurs à l'Administrateur (risque de verrouillage).
  if (role.name === "Administrateur" && domain === "users" && level !== "E") {
    return { error: "L'accès « Utilisateurs & rôles » de l'Administrateur ne peut pas être réduit." };
  }
  const perms = { ...((role.permissions as Record<string, string>) ?? {}), [domain]: level };
  const { error } = await admin.from("roles").update({ permissions: perms }).eq("id", roleId);
  if (error) return { error: error.message };
  revalidatePath("/utilisateurs");
  return { ok: true };
}

export async function setUserRole(userId: string, roleId: string) {
  if (!(await assertAdmin())) return { error: "Accès réservé à la direction." };
  const admin = createAdminClient();
  await admin.from("profiles").update({ role_id: roleId }).eq("id", userId);
  revalidatePath("/utilisateurs");
  return { ok: true };
}

export async function resetUserPassword(userId: string) {
  if (!(await assertAdmin())) return { error: "Accès réservé à la direction." };
  const admin = createAdminClient();
  const { data: got } = await admin.auth.admin.getUserById(userId);
  const email = got?.user?.email;
  if (!email) return { error: "Utilisateur introuvable." };
  const origin = await siteOrigin();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${origin}/reinitialiser` },
  });
  if (error) return { error: error.message };
  const resetLink = `${origin}/auth/confirm?token_hash=${data.properties?.hashed_token}&type=recovery&next=/reinitialiser`;
  return { ok: true, resetLink };
}

export async function deleteUser(userId: string) {
  if (!(await assertAdmin())) return { error: "Accès réservé à la direction." };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/utilisateurs");
  return { ok: true };
}
