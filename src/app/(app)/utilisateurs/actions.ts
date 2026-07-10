"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Seuls l'Administrateur et la Direction peuvent gérer les utilisateurs.
async function assertAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("roles(name)").eq("id", user.id).single();
  const role = (data?.roles as { name?: string } | null)?.name ?? "";
  return role === "Administrateur" || role === "Associé / Direction";
}

function genPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "#7";
}

export async function inviteUser(email: string, roleId: string, fullName: string) {
  if (!(await assertAdmin())) return { error: "Accès réservé à la direction." };
  const admin = createAdminClient();
  const tempPassword = genPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) return { error: error.message };
  if (data.user && roleId) {
    await admin.from("profiles").update({ role_id: roleId, full_name: fullName, email: email.trim() }).eq("id", data.user.id);
  }
  revalidatePath("/utilisateurs");
  return { ok: true, tempPassword };
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
  const tempPassword = genPassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: tempPassword });
  if (error) return { error: error.message };
  return { ok: true, tempPassword };
}

export async function deleteUser(userId: string) {
  if (!(await assertAdmin())) return { error: "Accès réservé à la direction." };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/utilisateurs");
  return { ok: true };
}
