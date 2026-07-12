import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import IdleTimeout from "@/components/IdleTimeout";
import { createClient } from "@/lib/supabase/server";
import { getMyPermissions } from "@/lib/auth/permissions";
import { allowedNavKeys } from "@/lib/nav";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Profil + rôle de l'utilisateur connecté
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, must_set_password, roles(name)")
    .eq("id", user.id)
    .single();

  // Un utilisateur invité qui n'a pas encore défini son mot de passe ne peut pas
  // accéder à l'application : on le renvoie vers la page de choix du mot de passe.
  if (profile?.must_set_password) redirect("/reinitialiser");

  const roleName =
    (profile?.roles as { name?: string } | null)?.name ?? "Utilisateur";
  const displayName = profile?.full_name || profile?.email || user.email || "";

  const { perms } = await getMyPermissions();
  const allowedKeys = allowedNavKeys(perms);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", color: "var(--ink)" }}>
      <IdleTimeout />
      <Sidebar userName={displayName} roleName={roleName} allowedKeys={allowedKeys} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--cream)" }}>
        <AppHeader />
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 26px 60px" }}>{children}</div>
      </main>
    </div>
  );
}
