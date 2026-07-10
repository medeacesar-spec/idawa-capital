"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PartnersData, Partner } from "@/lib/data/partners";
import { fmtM } from "@/lib/format";
import PartnerFormModal from "./PartnerFormModal";

const STATUS_BADGE: Record<string, { bg: string; fg: string }> = {
  "Engagé": { bg: "var(--green-bg)", fg: "var(--green-fg)" },
  "En discussion": { bg: "var(--amber-bg)", fg: "var(--amber-fg)" },
  "Due diligence": { bg: "#F0E4D0", fg: "#8A5A3C" },
};

const REL_ICON: Record<string, string> = {
  "Investisseur fonds": "🏦",
  "Bailleur programme": "🤝",
  "Co-investisseur": "👥",
};

export default function PartnersClient({ data }: { data: PartnersData }) {
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilter] = useState<string>("all");
  const [modal, setModal] = useState<{ open: boolean; partner: Partner | null }>({ open: false, partner: null });
  const relTypes = Array.from(new Set(data.partners.map((p) => p.relationType).filter(Boolean))) as string[];
  const list = filter === "all" ? data.partners : data.partners.filter((p) => p.relationType === filter);

  // Recherche : ouvrir directement le partenaire ciblé (?focus=id)
  useEffect(() => {
    const focus = params.get("focus");
    if (!focus) return;
    const p = data.partners.find((x) => x.id === focus);
    if (p) {
      setModal({ open: true, partner: p });
      window.history.replaceState(null, "", "/partenaires");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(p: Partner) {
    if (!confirm(`Supprimer le partenaire « ${p.name} » ?`)) return;
    const supabase = createClient();
    await supabase.from("partners").delete().eq("id", p.id);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 13, marginBottom: 16, maxWidth: 520 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>Montants engagés</div>
          <div className="serif tnum" style={{ fontSize: 24, fontWeight: 600, color: "var(--green-fg)", marginTop: 5 }}>{fmtM(data.totals.committed)}</div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>En discussion</div>
          <div className="serif tnum" style={{ fontSize: 24, fontWeight: 600, color: "var(--amber-fg)", marginTop: 5 }}>{fmtM(data.totals.discussion)}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", ...relTypes].map((t) => {
            const on = t === filter;
            return (
              <button key={t} onClick={() => setFilter(t)}
                style={{ padding: "7px 13px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}` }}>
                {t === "all" ? "Tous" : t}
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, partner: null })}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Nouveau partenaire
        </button>
      </div>

      <div className="card" style={{ padding: "4px 18px" }}>
        {list.map((p, i) => {
          const badge = STATUS_BADGE[p.status ?? ""] ?? { bg: "var(--neutral-bg)", fg: "var(--neutral-fg)" };
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
                  {p.status && <span className="badge" style={{ background: badge.bg, color: badge.fg }}>{p.status}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                  {REL_ICON[p.relationType ?? ""] ?? ""} {p.relationType ?? "—"} · {p.attachment}
                </div>
              </div>
              <div style={{ display: "flex", gap: 22, textAlign: "right" }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>Engagé</div>
                  <div className="serif tnum" style={{ fontSize: 13, fontWeight: 600, color: p.committed > 0 ? "var(--green-fg)" : "var(--text-3)" }}>{p.committed > 0 ? fmtM(p.committed) : "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>En discussion</div>
                  <div className="serif tnum" style={{ fontSize: 13, fontWeight: 600, color: p.discussion > 0 ? "var(--amber-fg)" : "var(--text-3)" }}>{p.discussion > 0 ? fmtM(p.discussion) : "—"}</div>
                </div>
              </div>
              <div className="row-actions">
                <button onClick={() => setModal({ open: true, partner: p })} aria-label="Modifier"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg></button>
                <button onClick={() => remove(p)} aria-label="Supprimer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
              </div>
            </div>
          );
        })}
      </div>
      {modal.open && <PartnerFormModal partner={modal.partner} programs={data.programs} onClose={() => setModal({ open: false, partner: null })} />}
    </div>
  );
}
