import { getPartnersData } from "@/lib/data/partners";
import PartnersClient from "@/components/partners/PartnersClient";
import { createClient } from "@/lib/supabase/server";

const DIRECTION_ROLES = ["Administrateur", "Associé / Direction"];

export default async function PartenairesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("roles(name)")
    .eq("id", user?.id ?? "")
    .single();
  const role = (profile?.roles as { name?: string } | null)?.name ?? "";

  if (!DIRECTION_ROLES.includes(role)) {
    return (
      <div className="card" style={{ padding: "40px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        <div>
          <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Accès réservé à la direction</div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 3 }}>Les informations sur les partenaires et bailleurs ne sont visibles que par la direction.</div>
        </div>
      </div>
    );
  }

  const data = await getPartnersData();
  return <PartnersClient data={data} />;
}
