"use client";

import { usePathname, useRouter } from "next/navigation";
import { PAGE_META } from "@/lib/nav";
import Search from "@/components/Search";

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
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
        <Search />
        <button className="btn btn-primary" onClick={() => router.push("/saisie")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Saisir un reporting
        </button>
      </div>
    </header>
  );
}
