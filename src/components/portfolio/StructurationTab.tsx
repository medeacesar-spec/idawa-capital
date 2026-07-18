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
  const [f, setF] = useState({
    ehsSector: data.ehsSector ?? "",
    valuationMethodEntry: data.valuationMethodEntry ?? "",
    valuationMethodCurrent: data.valuationMethodCurrent ?? "",
    exitScenario: data.exitScenario ?? "",
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Méthode de valorisation à l'acquisition">
            <Select value={f.valuationMethodEntry} onChange={(e) => { set("valuationMethodEntry", e.target.value); save({ valuation_method_entry: e.target.value || null }); }}>
              <option value="">— Non définie —</option>
              {VALUATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Méthode de valorisation à date">
            <Select value={f.valuationMethodCurrent} onChange={(e) => { set("valuationMethodCurrent", e.target.value); save({ valuation_method_current: e.target.value || null }); }}>
              <option value="">— Non définie —</option>
              {VALUATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
      </div>

      <div style={panel}>
        <h3 style={h3}>Piste de sortie</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Scénario de sortie">
            <Select value={f.exitScenario} onChange={(e) => { set("exitScenario", e.target.value); save({ exit_scenario: e.target.value || null }); }}>
              <option value="">— Non défini —</option>
              {EXIT_SCENARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Année de sortie attendue">
            <Input type="number" value={f.exitYear} onChange={(e) => set("exitYear", e.target.value)}
              onBlur={() => save({ exit_year: num(f.exitYear) })} placeholder="Ex : 2029" />
          </Field>
        </div>
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
