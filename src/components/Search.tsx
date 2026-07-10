"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Result = { label: string; sub: string; href: string };

export default function Search() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const supabase = createClient();
      const like = `%${q.trim()}%`;
      const [deals, cos, contacts] = await Promise.all([
        supabase.from("deals").select("id, company_name, stage").ilike("company_name", like).limit(5),
        supabase.from("portfolio_companies").select("id, name").ilike("name", like).limit(5),
        supabase.from("contacts").select("id, name, organization").ilike("name", like).limit(5),
      ]);
      const r: Result[] = [];
      (deals.data ?? []).forEach((d) => r.push({ label: d.company_name, sub: `Dossier · ${d.stage}`, href: "/pipeline" }));
      (cos.data ?? []).forEach((c) => r.push({ label: c.name, sub: "Portefeuille", href: "/portefeuille" }));
      (contacts.data ?? []).forEach((c) => r.push({ label: c.name, sub: `Contact · ${c.organization ?? ""}`, href: "/contacts" }));
      setResults(r);
      setOpen(true);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  function go(href: string) { setOpen(false); setQ(""); router.push(href); }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 9, padding: "7px 11px", color: "var(--text-3)", fontSize: 12, minWidth: 200 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => q.length >= 2 && setOpen(true)} placeholder="Rechercher…"
          style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, fontFamily: "inherit", color: "var(--ink)", width: "100%" }} />
      </div>
      {open && results.length > 0 && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 300, padding: "6px", zIndex: 50, maxHeight: 340, overflowY: "auto" }}>
          {results.map((r, i) => (
            <button key={i} onClick={() => go(r.href)} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "8px 10px", borderRadius: 8, fontFamily: "inherit" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-cream)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{r.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>{r.sub}</div>
            </button>
          ))}
        </div>
      )}
      {open && q.trim().length >= 2 && results.length === 0 && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 300, padding: "14px", zIndex: 50, fontSize: 12.5, color: "var(--text-3)" }}>Aucun résultat pour « {q} ».</div>
      )}
    </div>
  );
}
