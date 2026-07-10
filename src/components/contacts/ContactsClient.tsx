"use client";

import { useState } from "react";
import type { ContactsData, Contact } from "@/lib/data/contacts";

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function ContactRow({ c }: { c: Contact }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0" }}>
      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        {initials(c.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{c.function ?? "—"}</div>
      </div>
      {c.email && (
        <a href={`mailto:${c.email}`} style={{ fontSize: 11.5, color: "var(--camel)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{c.email}</a>
      )}
    </div>
  );
}

export default function ContactsClient({ data }: { data: ContactsData }) {
  const [filter, setFilter] = useState<string>("all");
  const groups = filter === "all" ? data.groups : data.groups.filter((g) => g.orgType === filter);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        {["all", ...data.orgTypes].map((t) => {
          const on = t === filter;
          return (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding: "7px 13px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}` }}>
              {t === "all" ? "Toutes les organisations" : t}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 14 }}>
        <b className="tnum" style={{ color: "var(--ink)" }}>{data.total}</b> contacts · {groups.length} organisations
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        {groups.map((g) => (
          <div key={g.organization} className="card" style={{ padding: "13px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, paddingBottom: 8, borderBottom: "1px solid var(--sep)" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{g.organization}</span>
              {g.orgType && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{g.orgType}</span>}
            </div>
            {g.contacts.map((c) => <ContactRow key={c.id} c={c} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
