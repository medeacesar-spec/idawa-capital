"use client";

import { usePathname } from "next/navigation";
import { PAGE_META } from "@/lib/nav";

export default function AppHeader() {
  const pathname = usePathname();
  const key = pathname.split("/").filter(Boolean)[0] || "dashboard";
  const meta = PAGE_META[key] ?? { title: "Idawa Capital", sub: "" };

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

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 9, padding: "7px 11px", color: "var(--text-3)", fontSize: 12 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span>Rechercher</span>
        </div>
        <button className="btn btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Saisir un reporting
        </button>
      </div>
    </header>
  );
}
