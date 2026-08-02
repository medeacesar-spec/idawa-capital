"use client";

import { usePathname } from "next/navigation";
import { PAGE_META } from "@/lib/nav";
import Search from "@/components/Search";
import { useMobileNav } from "@/components/MobileNav";

// Pages de réglages où la recherche de sociétés/dossiers n'a pas de sens.
const NO_SEARCH = new Set(["compte", "utilisateurs", "parametres"]);

export default function AppHeader() {
  const pathname = usePathname();
  const { setOpen } = useMobileNav();
  const key = pathname.split("/").filter(Boolean)[0] || "dashboard";
  const meta = PAGE_META[key] ?? { title: "Idawa Capital", sub: "" };
  const showSearch = !NO_SEARCH.has(key);

  return (
    <header
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 26px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(250,246,240,.85)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <button
        className="mobile-menu-btn"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        style={{ width: 38, height: 38, borderRadius: 9, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--espresso)", cursor: "pointer", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>

      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontWeight: 700, fontSize: 22, lineHeight: 1.1 }}>{meta.title}</h1>
        <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 2 }}>{meta.sub}</div>
      </div>

      {showSearch && (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
          <Search />
        </div>
      )}
    </header>
  );
}
