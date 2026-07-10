"use client";

import { useState } from "react";
import type { DashboardData, ProgramMetrics, ProgNature } from "@/lib/data/dashboard";
import { fmtM, fmtMult, fmtPct, fmtInt, fmtFCFA } from "@/lib/format";

const NATURE_LABEL: Record<ProgNature, string> = {
  invest: "Investissement",
  accompagnement: "Accompagnement",
  mixte: "Mixte",
};
const NATURE_BADGE: Record<ProgNature, { bg: string; fg: string }> = {
  invest: { bg: "var(--green-bg)", fg: "var(--green-fg)" },
  accompagnement: { bg: "var(--amber-bg)", fg: "var(--amber-fg)" },
  mixte: { bg: "#F0E4D0", fg: "#8A5A3C" },
};

function Tile({ k, v, d, dc, sub }: { k: string; v: string; d?: string; dc?: string; sub?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "15px 16px" }}>
      <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{k}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
        <span className="serif tnum" style={{ fontSize: 25, fontWeight: 600, color: "var(--ink)", lineHeight: 1, whiteSpace: "nowrap" }}>{v}</span>
        {d && <span style={{ fontSize: 11.5, fontWeight: 600, color: dc ?? "var(--text-3)", whiteSpace: "nowrap" }}>{d}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Badge({ nature }: { nature: ProgNature }) {
  const c = NATURE_BADGE[nature];
  return <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>{NATURE_LABEL[nature]}</span>;
}

const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" };
const h3: React.CSSProperties = { fontSize: 13.5, fontWeight: 600, margin: 0, color: "var(--ink)" };

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [scope, setScope] = useState<string>("global");
  const isGlobal = scope === "global";
  const prog = data.programs.find((p) => p.id === scope);

  return (
    <div>
      {/* Sélecteur de périmètre */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[{ id: "global", name: "Global", color: "var(--espresso)" }, ...data.programs].map((s) => {
          const on = s.id === scope;
          const color = "color" in s ? s.color : "var(--espresso)";
          return (
            <button key={s.id} onClick={() => setScope(s.id)}
              style={{ padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                background: on ? color : "var(--surface)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? color : "var(--border-strong)"}` }}>
              {s.name}
            </button>
          );
        })}
      </div>

      {isGlobal ? <GlobalView data={data} /> : prog ? <ProgramView p={prog} /> : null}
    </div>
  );
}

function GlobalView({ data }: { data: DashboardData }) {
  const g = data.global;
  const delta = g.invested > 0 ? Math.round(((g.valuation - g.invested) / g.invested) * 100) : 0;
  const maxFunnel = Math.max(1, ...g.funnel.map((f) => f.count));

  // Répartition (donut)
  const totalW = data.programs.reduce((a, p) => a + p.weight, 0) || 1;
  const circ = 2 * Math.PI * 54;
  let acc = 0;
  const segs = data.programs.filter((p) => p.weight > 0).map((p) => {
    const pct = (p.weight / totalW) * 100;
    const len = (pct / 100) * circ;
    const seg = { color: p.color, name: p.name, pct: Math.round(pct), dash: `${len} ${circ - len}`, offset: -acc };
    acc += len;
    return seg;
  });

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13, marginBottom: 16 }}>
        <Tile k="Capital investi" v={fmtM(g.invested)} sub={`FCFA · ${data.programs.reduce((a, p) => a + p.companies, 0)} participations`} />
        <Tile k="Valeur du portefeuille" v={fmtM(g.valuation)} d={`${delta >= 0 ? "+" : ""}${delta}%`} dc={delta >= 0 ? "var(--green-fg)" : "var(--red-fg)"} sub="vs capital investi" />
        <Tile k="Multiple (TVPI)" v={fmtMult(g.tvpi)} dc="var(--green-fg)" sub="Performance globale" />
        <Tile k="Dossiers actifs" v={fmtInt(g.activeDealsCount)} sub={`${fmtM(g.pipelineAmount)} en pipeline`} />
      </div>

      {/* Tableau comparatif des programmes */}
      <div style={{ ...panel, marginBottom: 13 }}>
        <h3 style={{ ...h3, marginBottom: 12 }}>Performance par programme <span style={{ fontWeight: 400, color: "var(--text-3)" }}>— chaque programme suit sa propre dynamique</span></h3>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr .95fr .9fr .9fr .78fr .95fr .55fr", gap: 10, paddingBottom: 8, fontSize: 10, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--text-3)", fontWeight: 600 }}>
          <div>Programme</div><div>Type</div><div style={{ textAlign: "right" }}>Engagé</div><div style={{ textAlign: "right" }}>Réalisé</div><div style={{ textAlign: "right" }}>Perf.</div><div style={{ textAlign: "right" }}>Suivi</div><div style={{ textAlign: "center" }}>Dossiers</div>
        </div>
        {data.programs.map((p) => {
          const fin = p.nature !== "accompagnement";
          const engaged = fin ? fmtM(p.invested) : p.budget != null ? fmtM(p.budget) : "—";
          const realized = fin ? fmtM(p.valuation) : p.disbursed != null ? fmtM(p.disbursed) : "—";
          const perf = fin ? fmtMult(p.tvpi) : fmtPct(p.execRate);
          const suivi = fin ? fmtPct(p.tri) : p.pme != null ? `${fmtInt(p.pme)} PME` : "—";
          const suiviColor = fin ? (num(p.tri) >= 0 ? "var(--green-fg)" : "var(--red-fg)") : "var(--ink)";
          return (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.5fr .95fr .9fr .9fr .78fr .95fr .55fr", gap: 10, alignItems: "center", padding: "11px 0", borderTop: "1px solid var(--sep)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
              </div>
              <div><Badge nature={p.nature} /></div>
              <div className="serif" style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink)" }}>{engaged}</div>
              <div className="serif" style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink)" }}>{realized}</div>
              <div className="serif" style={{ textAlign: "right", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{perf}</div>
              <div className="serif" style={{ textAlign: "right", fontSize: 12.5, fontWeight: 600, color: suiviColor }}>{suivi}</div>
              <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-2)" }}>{p.dealsCount}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        {/* Répartition par programme */}
        <div style={panel}>
          <h3 style={{ ...h3, marginBottom: 8 }}>Répartition par programme</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg viewBox="0 0 140 140" width="128" height="128" style={{ flexShrink: 0 }}>
              <g transform="rotate(-90 70 70)">
                {segs.map((s, i) => (
                  <circle key={i} cx="70" cy="70" r="54" fill="none" stroke={s.color} strokeWidth="18" strokeDasharray={s.dash} strokeDashoffset={s.offset} />
                ))}
              </g>
              <text x="70" y="66" textAnchor="middle" className="serif" style={{ fontSize: 16, fontWeight: 700, fill: "var(--ink)" }}>{fmtFCFA(totalW).split(" ")[0]}</text>
              <text x="70" y="82" textAnchor="middle" style={{ fontSize: 8, fill: "var(--text-3)", letterSpacing: 1 }}>{fmtFCFA(totalW).split(" ").slice(1).join(" ").toUpperCase()} FCFA</text>
            </svg>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
              {segs.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: "#5E4636", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                  <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Entonnoir du pipeline */}
        <div style={panel}>
          <h3 style={{ ...h3, marginBottom: 14 }}>Entonnoir du pipeline</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {g.funnel.map((f) => (
              <div key={f.stage} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 96, fontSize: 11.5, color: "var(--text-2)", textAlign: "right" }}>{f.stage}</div>
                <div style={{ flex: 1, background: "#F1E7D8", borderRadius: 6, height: 22 }}>
                  <div style={{ width: `${(f.count / maxFunnel) * 100}%`, height: "100%", background: "var(--camel)", borderRadius: 6, minWidth: f.count ? 6 : 0 }} />
                </div>
                <div className="serif" style={{ width: 22, fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{f.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ProgramView({ p }: { p: ProgramMetrics }) {
  const fin = p.nature !== "accompagnement";
  const note = fin
    ? "Suivi financier : capital déployé, valeur et multiples."
    : "Suivi d'activité et d'impact : budget, bénéficiaires et emplois.";
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge nature={p.nature} />
        <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>{note}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13, marginBottom: 16 }}>
        {fin ? (
          <>
            <Tile k="Capital investi" v={fmtM(p.invested)} sub={`${p.companies} participations`} />
            <Tile k="Valeur actuelle" v={fmtM(p.valuation)} />
            <Tile k="Multiple (TVPI)" v={fmtMult(p.tvpi)} dc="var(--green-fg)" />
            <Tile k="TRI moyen" v={fmtPct(p.tri)} dc={num(p.tri) >= 0 ? "var(--green-fg)" : "var(--red-fg)"} />
          </>
        ) : (
          <>
            <Tile k="Budget alloué" v={p.budget != null ? fmtM(p.budget) : "—"} />
            <Tile k="Montant décaissé" v={p.disbursed != null ? fmtM(p.disbursed) : "—"} d={p.execRate != null ? fmtPct(p.execRate) : undefined} dc="var(--amber-fg)" sub="taux d'exécution" />
            <Tile k="PME accompagnées" v={p.pme != null ? fmtInt(p.pme) : "—"} />
            <Tile k="Emplois créés" v={p.jobs != null ? fmtInt(p.jobs) : "—"} dc="var(--green-fg)" />
          </>
        )}
      </div>
      <div style={panel}>
        <h3 style={{ ...h3, marginBottom: 6 }}>Pipeline du programme</h3>
        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
          {p.dealsCount} deal{p.dealsCount > 1 ? "s" : ""} · {fmtM(p.pipelineAmount)} en jeu
        </div>
      </div>
    </>
  );
}

function num(v: number | null): number {
  return v == null ? 0 : v;
}
