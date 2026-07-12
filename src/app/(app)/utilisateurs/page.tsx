import { createClient } from "@/lib/supabase/server";
import UsersClient from "@/components/users/UsersClient";
import AccessMatrix from "@/components/users/AccessMatrix";
import { getMyPermissions, can } from "@/lib/auth/permissions";

export default async function UtilisateursPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { perms } = await getMyPermissions();

  if (!can(perms, "users")) {
    return (
      <div className="card" style={{ padding: "40px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        <div>
          <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Accès réservé à la direction</div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 3 }}>La gestion des utilisateurs est réservée à l'Administrateur et à la Direction.</div>
        </div>
      </div>
    );
  }

  const [profRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role_id, roles(name)").order("created_at"),
    supabase.from("roles").select("id, name, permissions").order("created_at"),
  ]);

  const users = (profRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? "",
    email: p.email ?? "",
    roleId: p.role_id as string | null,
    roleName: (p.roles as { name?: string } | null)?.name ?? "Sans rôle",
  }));
  const rolesFull = (rolesRes.data ?? []).map((r) => ({ id: r.id, name: r.name, permissions: (r.permissions as Record<string, string> | null) }));
  const roles = rolesFull.map((r) => ({ id: r.id, name: r.name }));

  return (
    <>
      <UsersClient users={users} roles={roles} currentUserId={user?.id ?? ""} />
      <AccessMatrix roles={rolesFull} />
    </>
  );
}
