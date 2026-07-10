"use client";

import { usePathname } from "next/navigation";
import { PAGE_META } from "@/lib/nav";
import Search from "@/components/Search";

// Pages de réglages où la recherche de sociétés/dossiers n'a pas de sens.
const NO_SEARCH = new Set(["compte", "utilisateurs", "parametres"]);

export default function AppHeader() {
  const pathname = usePathname();
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
