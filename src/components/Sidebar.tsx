"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";

function initials(name: string): string {
  const parts = name.replace(/@.*/, "").split(/[\s.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

// Icônes (tracé SVG) par clé de navigation — reprises du design.
const ICONS: Record<string, React.ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="7" height="8" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="11" width="7" height="10" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>),
  pipeline: (<><circle cx="5" cy="6" r="2.4" /><circle cx="5" cy="18" r="2.4" /><circle cx="19" cy="12" r="2.4" /><path d="M7.3 7.2 16.7 11M7.3 16.8 16.7 13" /></>),
  portefeuille: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5.5A2 2 0 0 1 10 3.5h4a2 2 0 0 1 2 2V7" /><path d="M3 12h18" /></>),
  performance: (<><path d="M4 4v16h16" /><path d="M7 15l3.5-4 3 2.5L20 7" /></>),
  esg: (<><path d="M11 20A7 7 0 0 1 4 13C4 8 8 4 20 4c0 8-4 12-9 12z" /><path d="M11 20c0-5 2-8 6-10" /></>),
  reporting: (<><path d="M5 3h9l5 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M9 13v4M12 11v6M15 15v2" /></>),
  contacts: (<><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-3-4.9" /></>),
  documents: (<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>),
  partenaires: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>),
  utilisateurs: (<><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 9-4.2" /><circle cx="17.5" cy="16.5" r="2.5" /><path d="M17.5 12.9v1.2M17.5 18.9v1.2M20.6 16.5h-1.2M15.6 16.5h-1.2" /></>),
  kpi: (<><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></>),
  parametres: (<><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="14" cy="18" r="2" /></>),
  compte: (<><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" /></>),
};

const GRP = "rgba(201,168,124,.75)";

export default function Sidebar({
  userName,
  roleName,
  allowedKeys,
}: {
  userName: string;
  roleName: string;
  allowedKeys: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = new Set(allowedKeys);
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allowed.has(i.key)) })).filter((g) => g.items.length > 0);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      style={{
        width: 238,
        flexShrink: 0,
        background: "var(--brown)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,.10)" }}>
        <Image src="/brand/wordmark-cream.png" alt="Idawa Capital" width={130} height={40} style={{ width: 130, height: "auto" }} priority />
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px 20px" }}>
        {groups.map((group) => (
          <div key={group.title}>
            <div style={{ padding: "12px 10px 5px", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: GRP }}>
              {group.title}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "9px 11px",
                    borderRadius: 9,
                    fontSize: 12.5,
                    borderLeft: `2px solid ${active ? "var(--gold)" : "transparent"}`,
                    background: active ? "rgba(201,168,124,.16)" : "transparent",
                    color: active ? "#F5ECE0" : "rgba(245,236,224,.72)",
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--gold)" : "rgba(245,236,224,.6)"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[item.key]}
                  </svg>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,.10)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--camel)", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textTransform: "uppercase" }}>
            {initials(userName) || "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: "#F5ECE0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
            <div style={{ fontSize: 10, color: GRP }}>{roleName}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "rgba(245,236,224,.8)", fontSize: 10.5, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
