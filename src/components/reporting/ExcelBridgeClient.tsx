"use client";

// Passerelle Excel : sortir les données pour les présenter, puis réinjecter ce qui a
// été retravaillé. Le retour passe toujours par un écart affiché avant → après.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readReinjection, applyReinjection, type ReadResult } from "@/app/(app)/reporting/excel/actions";
import type { Change } from "@/lib/export/datasets";

type Dataset = { key: string; label: string; hint: string; editable: string[] };

const DASH = "—";

export default function ExcelBridgeClient({ datasets, canEdit }: { datasets: Dataset[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dataset, setDataset] = useState(datasets[0]?.key ?? "");
  const [result, setResult] = useState<Exclude<ReadResult, { error: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ applied: number; rows: number } | null>(null);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  const current = datasets.find((d) => d.key === dataset);
  const retained: Change[] = (result?.changes ?? []).filter((_, i) => !skipped.has(i));

  function analyze(form: FormData) {
    setError(null); setDone(null); setSkipped(new Set());
    form.set("dataset", dataset);
    startTransition(async () => {
      const res = await readReinjection(form);
      if ("error" in res) { setError(res.error); setResult(null); return; }
      setResult(res);
    });
  }

  function apply() {
    setError(null);
    startTransition(async () => {
      const res = await applyReinjection(dataset, retained);
      if ("error" in res) { setError(res.error); return; }
      setDone(res);
      setResult(null);
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 className="serif" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Passerelle Excel</h1>
        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
          Sortir les données pour les présenter, puis réinjecter ce qui a été retravaillé. Rien n&apos;est enregistré sans votre validation.
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 14, background: "var(--red-bg)", color: "var(--red-fg)", fontSize: 13 }}>{error}</div>
      )}
      {done && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 14, background: "var(--green-bg)", color: "var(--green-fg)", fontSize: 13 }}>
          {done.applied} valeur{done.applied > 1 ? "s" : ""} mise{done.applied > 1 ? "s" : ""} à jour sur {done.rows} ligne{done.rows > 1 ? "s" : ""}.
        </div>
      )}

      <section className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>1 · Choisir le jeu de données</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {datasets.map((d) => {
            const on = d.key === dataset;
            return (
              <button key={d.key} onClick={() => { setDataset(d.key); setResult(null); setDone(null); }}
                style={{
                  padding: "7px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: on ? 600 : 400,
                  border: `1px solid ${on ? "var(--espresso)" : "var(--border-strong)"}`,
                  background: on ? "var(--espresso)" : "var(--surface)", color: on ? "#fff" : "var(--text-2)",
                }}>{d.label}</button>
            );
          })}
        </div>
        {current && (
          <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.7 }}>
            {current.hint}<br />
            <strong style={{ color: "var(--ink)" }}>Colonnes modifiables au retour :</strong> {current.editable.join(" · ")}.
            Les autres sont exportées pour la lecture ; elles se modifient dans l&apos;outil.
          </div>
        )}
        <a href={`/reporting/excel/${dataset}`} className="btn btn-primary" style={{ marginTop: 12, textDecoration: "none", display: "inline-flex" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
          Télécharger le classeur
        </a>
      </section>

      {canEdit && (
        <section className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>2 · Réinjecter le classeur retravaillé</div>
          <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 10 }}>
            Déposez le fichier téléchargé après l&apos;avoir modifié. La colonne « Identifiant » sert à retrouver chaque ligne : ne la touchez pas.
          </div>
          <form action={analyze} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <input type="file" name="file" accept=".xlsx,.xlsm,.csv" style={{ fontSize: 12.5 }} />
            <button className="btn btn-ghost" type="submit" disabled={pending}>{pending ? "Lecture…" : "Comparer"}</button>
          </form>
        </section>
      )}

      {result && (
        <section className="card" style={{ padding: "18px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>3 · Les écarts</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
            {([
              ["Écarts trouvés", String(result.changes.length)],
              ["Valeurs inchangées", String(result.unchanged)],
              ["Lignes non reconnues", String(result.unknownRows)],
              ["Lignes lues", String(result.rowCount)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{ background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
                <div className="serif tnum" style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
              </div>
            ))}
          </div>

          {result.unknownRows > 0 && (
            <div style={{ padding: "10px 12px", background: "var(--amber-bg)", borderRadius: 9, fontSize: 11.5, color: "var(--amber-fg)", marginBottom: 12 }}>
              {result.unknownRows} ligne(s) sans identifiant reconnu — ignorée(s). Une ligne ajoutée dans Excel ne crée rien ici : les créations se font dans l&apos;outil.
            </div>
          )}
          {result.ignoredColumns.length > 0 && (
            <div style={{ fontSize: 11.5, color: "var(--text-2)", marginBottom: 12 }}>
              Colonnes lues mais non réinjectables : {result.ignoredColumns.join(" · ")}.
            </div>
          )}

          {result.changes.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--text-2)", fontStyle: "italic" }}>
              Aucun écart : le classeur correspond exactement à ce que contient l&apos;outil.
            </div>
          ) : (
            <>
              <div style={{ maxHeight: 420, overflow: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "var(--surface-cream)" }}>
                    <tr>
                      <th style={th}>Retenir</th><th style={th}>Ligne</th><th style={th}>Champ</th>
                      <th style={th}>Avant</th><th style={th}>Après</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.changes.map((c, i) => {
                      const off = skipped.has(i);
                      return (
                        <tr key={`${c.id}-${c.column}`} style={{ opacity: off ? 0.45 : 1 }}>
                          <td style={td}>
                            <input type="checkbox" checked={!off} onChange={(e) => {
                              setSkipped((s) => {
                                const next = new Set(s);
                                if (e.target.checked) next.delete(i); else next.add(i);
                                return next;
                              });
                            }} />
                          </td>
                          <td style={{ ...td, fontWeight: 600 }}>{c.label}</td>
                          <td style={{ ...td, color: "var(--text-2)" }}>{c.header}</td>
                          <td style={{ ...td, color: "var(--red-fg)" }}>{c.before ?? DASH}</td>
                          <td style={{ ...td, color: "var(--green-fg)", fontWeight: 600 }}>{c.after ?? DASH}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={apply} disabled={pending || retained.length === 0}>
                  {pending ? "Enregistrement…" : `Enregistrer ${retained.length} modification${retained.length > 1 ? "s" : ""}`}
                </button>
                <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>Chaque modification sera tracée dans le journal d&apos;audit.</span>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-2)", padding: "7px 10px", borderBottom: "1px solid var(--border-strong)" };
const td: React.CSSProperties = { fontSize: 12.5, color: "var(--ink)", padding: "6px 10px", borderBottom: "1px solid var(--sep)" };
