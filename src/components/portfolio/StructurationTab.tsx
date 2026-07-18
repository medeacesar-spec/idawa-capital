"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { VALUATION_METHODS, EXIT_SCENARIOS, EHS_SECTORS } from "@/lib/ui-constants";
import type { Structuration } from "@/lib/data/companyDetail";

const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 14 };
const h3: React.CSSProperties = { fontSize: 14.5, fontWeight: 600, margin: "0 0 10px", color: "var(--ink)" };

export default function StructurationTab({ companyId, data }: { companyId: string; data: Structuration }) {
  const router = useRouter();
  const [vEntry, setVEntry] = useState<string[]>(data.valuationMethodsEntry ?? []);
  const [vCurrent, setVCurrent] = useState<string[]>(data.valuationMethodsCurrent ?? []);
  const [exits, setExits] = useState<string[]>(data.exitScenarios ?? []);
  const [f, setF] = useState({
    ehsSector: data.ehsSector ?? "",
    exitStrategy: data.exitStrategy ?? "",
    exitMultipleTarget: data.exitMultipleTarget != null ? String(data.exitMultipleTarget) : "",
    exitIrrTarget: data.exitIrrTarget != null ? String(data.exitIrrTarget) : "",
    exitYear: data.exitYear != null ? String(data.exitYear) : "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save(patch: Record<string, unknown>) {
    await createClient().from("portfolio_companies").update(patch).eq("id", companyId);
    router.refresh();
  }
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  return (
    <div>
      <div style={panel}>
        <h3 style={h3}>Valorisation</h3>
        <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12 }}>
          Les valorisations sont établies une fois par an et validées par le comité d'audit — elles ne sont pas suivies en continu.
        </div>
        <Field label="Méthodes de valorisation à l'acquisition" hint="Plusieurs méthodes possibles">
          <Chips options={VALUATION_METHODS} selected={vEntry}
            onToggle={(next) => { setVEntry(next); save({ valuation_methods_entry: next.length ? next : null }); }} />
        </Field>
        <Field label="Méthodes de valorisation à date" hint="Plusieurs méthodes possibles">
          <Chips options={VALUATION_METHODS} selected={vCurrent}
            onToggle={(next) => { setVCurrent(next); save({ valuation_methods_current: next.length ? next : null }); }} />
        </Field>
      </div>

      <div style={panel}>
        <h3 style={h3}>Piste de sortie</h3>
        <Field label="Scénarios de sortie envisagés" hint="Plusieurs pistes possibles — cochez toutes celles étudiées">
          <Chips options={EXIT_SCENARIOS} selected={exits}
            onToggle={(next) => { setExits(next); save({ exit_scenarios: next.length ? next : null }); }} />
        </Field>
        <Field label="Année de sortie attendue">
          <Input type="number" value={f.exitYear} onChange={(e) => set("exitYear", e.target.value)}
            onBlur={() => save({ exit_year: num(f.exitYear) })} placeholder="Ex : 2029" />
        </Field>
        <Field label="Modalités de sortie" hint="Put option ? Avec quelle formule de prix ? Cession à un tiers identifié ? Clauses du pacte…">
          <Textarea rows={4} value={f.exitStrategy} onChange={(e) => set("exitStrategy", e.target.value)}
            onBlur={() => save({ exit_strategy: f.exitStrategy.trim() || null })}
            placeholder="Ex : put option exerçable à partir de 2028, prix = 5× EBE moyen des 2 derniers exercices, plancher au coût historique majoré de 8 %/an…" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Multiple de sortie attendu">
            <Input type="number" value={f.exitMultipleTarget} onChange={(e) => set("exitMultipleTarget", e.target.value)}
              onBlur={() => save({ exit_multiple_target: num(f.exitMultipleTarget) })} placeholder="Ex : 2.5" />
          </Field>
          <Field label="TRI de sortie attendu (%)">
            <Input type="number" value={f.exitIrrTarget} onChange={(e) => set("exitIrrTarget", e.target.value)}
              onBlur={() => save({ exit_irr_target: num(f.exitIrrTarget) })} placeholder="Ex : 18" />
          </Field>
        </div>
      </div>

      <div style={panel}>
        <h3 style={h3}>Classification E&S</h3>
        <Field label="Secteur EHS (IFC)" hint="Secteur précis de l'entreprise — sert au diagnostic E&S">
          <Select value={f.ehsSector} onChange={(e) => { set("ehsSector", e.target.value); save({ ehs_sector: e.target.value || null }); }}>
            <option value="">— Non défini —</option>
            {EHS_SECTORS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((s) => <option key={s} value={s}>{s}</option>)}
              </optgroup>
            ))}
            {!!f.ehsSector && !EHS_SECTORS.some((g) => g.items.includes(f.ehsSector)) && <option value={f.ehsSector}>{f.ehsSector}</option>}
          </Select>
        </Field>
      </div>
    </div>
  );
}

/** Sélection multiple sous forme de puces cochables. */
function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (next: string[]) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button"
            onClick={() => onToggle(on ? selected.filter((x) => x !== o) : [...selected, o])}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
              fontFamily: "inherit", fontSize: 11.5, fontWeight: on ? 600 : 400,
              background: on ? "var(--accent-soft)" : "var(--surface)", color: on ? "var(--espresso)" : "var(--text-2)",
              border: `1px solid ${on ? "var(--camel)" : "var(--border-strong)"}` }}>
            {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
            {o}
          </button>
        );
      })}
    </div>
  );
}
