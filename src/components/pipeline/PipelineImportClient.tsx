"use client";

// Import de dossiers depuis un fichier partenaire, en trois temps :
//   1. la source      — un fichier déposé ou un copier-coller ;
//   2. la lecture     — quelle feuille, quelle ligne d'en-tête, quelle colonne vers quel champ ;
//   3. la vérification — ce qui sera créé, ce qui cloche, et alors seulement le bouton d'import.
//
// Rien n'est écrit avant le dernier clic, et l'écran de vérification montre AUSSI les
// colonnes non reprises : un import silencieux qui perd la moitié d'un fichier est pire
// qu'un import qui refuse de partir.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/form";
import { describeColumns, bodyRows, type Column } from "@/lib/import/table";
import { autoMap, buildDrafts, groupByCompany, composedDescription, TARGET_FIELDS, type FieldKey, type Mapping } from "@/lib/import/pipelineMapping";
import { analyzeImportSource, importDeals, type AnalyzeResult } from "@/app/(app)/pipeline/import/actions";

type Sheets = { name: string; rows: string[][] }[];

const fmtAmount = (n: number | null) => (n == null ? "—" : n.toLocaleString("fr-FR") + " F");

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="card" style={{ padding: "20px 22px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700,
          background: done ? "var(--green-bg)" : "var(--espresso)", color: done ? "var(--green-fg)" : "#fff",
        }}>{done ? "✓" : n}</span>
        <h2 className="serif" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function PipelineImportClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [sheets, setSheets] = useState<Sheets | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<Mapping>({});
  const [excludeFlagged, setExcludeFlagged] = useState(false);
  const [group, setGroup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; contacts: number } | null>(null);
  const [pasted, setPasted] = useState("");

  // Les colonnes et les lignes se recalculent dès que la feuille ou l'en-tête change :
  // ce sont des vues du tableau brut, jamais un état à maintenir en parallèle.
  const rows = sheets?.[sheetIndex]?.rows ?? [];
  const columns: Column[] = useMemo(() => (rows.length ? describeColumns(rows, headerRow) : []), [rows, headerRow]);
  const body = useMemo(() => (rows.length ? bodyRows(rows, headerRow) : []), [rows, headerRow]);

  const rawDrafts = useMemo(() => {
    if (!columns.length) return [];
    const aligned = body.map((r) => columns.map((c) => r[c.index] ?? ""));
    return buildDrafts(aligned, columns, mapping, headerRow);
  }, [body, columns, mapping, headerRow]);

  // Nombre de lignes en trop si l'on n'y touche pas — sert à proposer le regroupement.
  const duplicateRows = useMemo(
    () => rawDrafts.filter((d) => d.issues.some((i) => i.message.startsWith("Même nom"))).length,
    [rawDrafts]);

  const drafts = useMemo(() => (group ? groupByCompany(rawDrafts) : rawDrafts), [rawDrafts, group]);

  const nameMapped = Object.values(mapping).includes("companyName");
  const blocking = drafts.filter((d) => d.issues.some((i) => i.level === "bloquant"));
  const flagged = drafts.filter((d) => d.issues.some((i) => i.level === "attention"));
  // Une « information » (regroupement effectué) n'est pas un motif de mise à l'écart.
  const retained = drafts.filter((d) =>
    d.companyName.trim() !== "" &&
    (!excludeFlagged || !d.issues.some((i) => i.level !== "information")));
  const ignoredColumns = columns.filter((_, i) => !mapping[i]);

  function analyze(form: FormData) {
    setError(null); setDone(null);
    startTransition(async () => {
      const res: AnalyzeResult = await analyzeImportSource(form);
      if ("error" in res) { setError(res.error); return; }
      setSheets(res.sheets);
      setSheetIndex(res.sheetIndex);
      setHeaderRow(res.headerRow);
      setMapping(autoMap(res.columns.map((c) => c.header)));
    });
  }

  /** Changer de feuille ou d'en-tête invalide la correspondance : on la repropose. */
  function reread(nextSheet: number, nextHeader: number) {
    setSheetIndex(nextSheet);
    setHeaderRow(nextHeader);
    const r = sheets?.[nextSheet]?.rows ?? [];
    if (r.length) setMapping(autoMap(describeColumns(r, nextHeader).map((c) => c.header)));
  }

  function runImport() {
    setError(null);
    startTransition(async () => {
      const res = await importDeals(retained);
      if ("error" in res) { setError(res.error); return; }
      setDone({ created: res.created, contacts: res.contacts });
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button className="btn btn-ghost" onClick={() => router.push("/pipeline")}>← Pipeline</button>
        <div>
          <h1 className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Importer des dossiers</h1>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            Depuis un fichier Excel, un CSV ou un simple copier-coller. Rien n&apos;est enregistré avant votre confirmation.
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 14, background: "var(--red-bg)", color: "var(--red-fg)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {done ? (
        <div className="card" style={{ padding: "24px 26px", textAlign: "center" }}>
          <div className="serif" style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
            {done.created} dossier{done.created > 1 ? "s" : ""} créé{done.created > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16 }}>
            {done.contacts > 0 && `${done.contacts} contact${done.contacts > 1 ? "s" : ""} rattaché${done.contacts > 1 ? "s" : ""}. `}
            Ils sont <strong>sans programme</strong> : rattachez-les depuis le pipeline.
          </div>
          <button className="btn btn-primary" onClick={() => router.push("/pipeline")}>Voir le pipeline</button>
        </div>
      ) : (
        <>
          <Step n={1} title="La source" done={!!sheets}>
            <form action={analyze}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>
                    Déposer un fichier
                  </label>
                  <input type="file" name="file" accept=".xlsx,.xlsm,.csv,.tsv,.txt"
                    style={{ fontSize: 12.5, width: "100%" }} />
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
                    Excel (.xlsx), CSV ou TSV. Le format .xls ancien doit être ré-enregistré en .xlsx.
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>
                    …ou coller un tableau
                  </label>
                  <textarea name="pasted" value={pasted} onChange={(e) => setPasted(e.target.value)}
                    placeholder="Sélectionnez les cellules dans Excel, copiez, collez ici."
                    style={{ width: "100%", minHeight: 76, padding: "9px 11px", border: "1px solid var(--border-strong)", borderRadius: 10, fontSize: 12.5, fontFamily: "inherit", resize: "vertical" }} />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={pending} style={{ marginTop: 12 }}>
                {pending ? "Lecture…" : "Analyser"}
              </button>
            </form>
          </Step>

          {sheets && (
            <Step n={2} title="Ce que nous avons compris" done={nameMapped}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
                {sheets.length > 1 && (
                  <div style={{ minWidth: 220 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 5 }}>Feuille</label>
                    <Select value={sheetIndex} onChange={(e) => reread(Number(e.target.value), 0)}>
                      {sheets.map((s, i) => <option key={i} value={i}>{s.name} ({s.rows.length} lignes)</option>)}
                    </Select>
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 5 }}>Ligne des titres de colonnes</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button className="btn btn-ghost" type="button" disabled={headerRow === 0}
                      onClick={() => reread(sheetIndex, headerRow - 1)} aria-label="Ligne précédente">‹</button>
                    <span className="tnum serif" style={{ fontSize: 15, fontWeight: 600, minWidth: 30, textAlign: "center" }}>{headerRow + 1}</span>
                    <button className="btn btn-ghost" type="button" disabled={headerRow >= rows.length - 2}
                      onClick={() => reread(sheetIndex, headerRow + 1)} aria-label="Ligne suivante">›</button>
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-2)", paddingBottom: 8 }}>
                  {columns.length} colonnes · <strong style={{ color: "var(--ink)" }}>{body.length}</strong> lignes de données
                </div>
              </div>

              <div style={{ maxHeight: 380, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "var(--surface-cream)", zIndex: 1 }}>
                    <tr>
                      <th style={thStyle}>Colonne du fichier</th>
                      <th style={thStyle}>Exemple</th>
                      <th style={{ ...thStyle, width: 220 }}>Devient</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((c, i) => (
                      <tr key={c.index} style={{ background: mapping[i] ? "transparent" : "var(--surface-cream)" }}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: mapping[i] ? 600 : 400, color: mapping[i] ? "var(--ink)" : "var(--text-2)" }}>{c.header}</div>
                          <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{c.nonEmpty} valeur(s)</div>
                        </td>
                        <td style={{ ...tdStyle, color: "var(--text-2)", fontSize: 11.5, maxWidth: 320 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.samples[0] ? c.samples[0].slice(0, 90) : <em>vide</em>}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <Select value={mapping[i] ?? ""} style={{ padding: "6px 9px", fontSize: 12.5 }}
                            onChange={(e) => {
                              const v = (e.target.value || null) as FieldKey | null;
                              setMapping((m) => {
                                const next = { ...m, [i]: v };
                                // Un champ ne peut venir que d'une colonne : on libère l'ancienne.
                                if (v) for (const k of Object.keys(next)) {
                                  if (Number(k) !== i && next[Number(k)] === v) next[Number(k)] = null;
                                }
                                return next;
                              });
                            }}>
                            <option value="">— non repris —</option>
                            {TARGET_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!nameMapped && (
                <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--red-fg)" }}>
                  Indiquez quelle colonne donne le <strong>nom du dossier</strong> : sans elle, rien ne peut être créé.
                </div>
              )}
            </Step>
          )}

          {sheets && nameMapped && (
            <Step n={3} title="Vérification avant import">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                {([
                  ["Dossiers à créer", String(retained.length)],
                  ["Sans nom, écartés", String(blocking.length)],
                  [group && duplicateRows > 0 ? "Lignes regroupées" : "À vérifier",
                    group && duplicateRows > 0 ? String(duplicateRows) : String(flagged.length)],
                  ["Colonnes non reprises", String(ignoredColumns.length)],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "var(--text-2)" }}>{k}</div>
                    <div className="serif tnum" style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
                  </div>
                ))}
              </div>

              {ignoredColumns.length > 0 && (
                <details style={{ marginBottom: 14 }}>
                  <summary style={{ fontSize: 12.5, color: "var(--text-2)", cursor: "pointer" }}>
                    {ignoredColumns.length === 1
                      ? "Une colonne ne sera pas reprise — vérifiez qu'elle ne compte pas"
                      : `Ces ${ignoredColumns.length} colonnes ne seront pas reprises — vérifiez qu'aucune ne compte`}
                  </summary>
                  <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 8, lineHeight: 1.8 }}>
                    {ignoredColumns.map((c) => (
                      <span key={c.index} style={{ display: "inline-block", padding: "2px 9px", margin: "0 5px 5px 0", borderRadius: 999, background: "var(--neutral-bg)", color: "var(--neutral-fg)" }}>
                        {c.header}
                      </span>
                    ))}
                  </div>
                </details>
              )}

              {duplicateRows > 0 && (
                <div style={{ background: "var(--amber-bg)", borderRadius: 10, padding: "11px 14px", marginBottom: 12 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12.5, color: "var(--amber-fg)", cursor: "pointer" }}>
                    <input type="checkbox" checked={group} onChange={(e) => setGroup(e.target.checked)} style={{ marginTop: 2 }} />
                    <span>
                      <strong>Ce fichier décrit {drafts.length} entreprises sur {rawDrafts.length} lignes.</strong>{" "}
                      Regrouper les lignes d&apos;une même entreprise et retenir la plus récente
                      — les valeurs manquantes sont complétées par les lignes antérieures.
                      {!group && " Décoché, chaque ligne deviendra un dossier distinct."}
                    </span>
                  </label>
                </div>
              )}

              {flagged.length > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-2)", marginBottom: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={excludeFlagged} onChange={(e) => setExcludeFlagged(e.target.checked)} />
                  Laisser de côté les {flagged.length} ligne(s) signalée(s), pour les traiter à part
                </label>
              )}

              <div style={{ maxHeight: 400, overflow: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "var(--surface-cream)", zIndex: 1 }}>
                    <tr>
                      <th style={thStyle}>Ligne</th>
                      <th style={thStyle}>Nom du dossier</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Montant</th>
                      <th style={thStyle}>Secteur</th>
                      <th style={thStyle}>Contact</th>
                      <th style={thStyle}>Contrôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.slice(0, 300).map((d) => {
                      const kept = retained.includes(d);
                      return (
                        <tr key={d.sourceRow} style={{ opacity: kept ? 1 : 0.45 }}>
                          <td style={{ ...tdStyle, color: "var(--text-3)", fontSize: 11 }}>{d.sourceRow}</td>
                          <td style={{ ...tdStyle, maxWidth: 260 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                              {d.companyName || <em style={{ color: "var(--red-fg)" }}>sans nom</em>}
                            </div>
                            {composedDescription(d) && (
                              <div style={{ fontSize: 10.5, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {composedDescription(d)!.replace(/\n+/g, " · ").slice(0, 70)}
                              </div>
                            )}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }} className="tnum">{fmtAmount(d.amount)}</td>
                          <td style={{ ...tdStyle, color: "var(--text-2)", fontSize: 11.5 }}>{d.sector ?? "—"}</td>
                          <td style={{ ...tdStyle, color: "var(--text-2)", fontSize: 11.5 }}>{d.contactName ?? "—"}</td>
                          <td style={{ ...tdStyle, fontSize: 11 }}>
                            {d.issues.length === 0
                              ? <span style={{ color: "var(--green-fg)" }}>ok</span>
                              : d.issues.map((iss, n) => (
                                  <div key={n} style={{ color: iss.level === "bloquant" ? "var(--red-fg)" : iss.level === "information" ? "var(--text-2)" : "var(--amber-fg)" }}>{iss.message}</div>
                                ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {drafts.length > 300 && (
                <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 8 }}>
                  Aperçu limité aux 300 premières lignes ; l&apos;import portera bien sur les {retained.length} dossiers retenus.
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={runImport} disabled={pending || retained.length === 0}>
                  {pending ? "Import en cours…" : `Créer ${retained.length} dossier${retained.length > 1 ? "s" : ""}`}
                </button>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>
                  Les dossiers entreront au stade « Sourcing », <strong>sans programme</strong> — à rattacher ensuite.
                </span>
              </div>
            </Step>
          )}
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-2)",
  padding: "8px 10px", borderBottom: "1px solid var(--border-strong)",
};
const tdStyle: React.CSSProperties = {
  fontSize: 12.5, color: "var(--ink)", padding: "7px 10px", borderBottom: "1px solid var(--sep)", verticalAlign: "top",
};
