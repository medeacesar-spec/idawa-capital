"use client";

// Import d'états financiers OHADA par COPIER-COLLER, sans aucun service payant.
// Deux temps, jamais un seul : on analyse, PUIS on fait vérifier avant d'écrire quoi que
// ce soit en base. Aucune écriture comptable ne doit se faire à l'aveugle.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import { parseOhadaPaste, pickColumn, columnOptions, pickKey, parsePickKey, type ParseResult, type ColumnPick } from "@/lib/finance/ohadaImport";

const fmt = (v: number | null) => (v == null ? "—" : Math.round(v).toLocaleString("fr-FR"));

export default function OhadaImportModal({ companyId, years, onClose }: { companyId: string; years: number[]; onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [year, setYear] = useState<number>(years[0] ?? new Date().getFullYear());
  const [pick, setPick] = useState<ColumnPick>({ from: "left", index: 0 });
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);

  // Seules les lignes de SAISIE sont importables : les totaux et soldes sont recalculés
  // par l'application, les réécrire depuis le document créerait des incohérences.
  const inputLines = useMemo(() => (result?.lines ?? []).filter((l) => l.kind === "input"), [result]);
  const totalLines = useMemo(() => (result?.lines ?? []).filter((l) => l.kind === "total"), [result]);

  const valueOf = (code: string, numbers: number[]): number | null => {
    if (edited[code] !== undefined) {
      const clean = edited[code].replace(/\s/g, "").replace(",", ".");
      if (clean === "") return null;
      const n = Math.round(Number(clean));
      return Number.isNaN(n) ? null : n;
    }
    const v = pickColumn(numbers, pick);
    // Convention de l'application : les charges se saisissent en POSITIF, les formules les
    // soustraient. Or les documents impriment souvent les charges entre parenthèses ou
    // précédées d'un signe. Reprendre ce signe tel quel inverserait le calcul, on retient
    // donc la valeur absolue — corrigeable à la main juste en dessous.
    return v == null ? null : Math.abs(v);
  };

  const retained = inputLines.filter((l) => !excluded.has(l.code) && valueOf(l.code, l.numbers) != null);

  function analyse() {
    const r = parseOhadaPaste(text);
    setResult(r);
    setEdited({});
    setExcluded(new Set());
    // Deux colonnes ou plus : le document présente presque toujours l'exercice courant
    // avant le précédent — on propose la première, l'utilisateur corrige d'un clic.
    setPick({ from: "left", index: 0 });
  }

  async function save() {
    setBusy(true);
    setError(null);
    const payload = retained.map((l) => ({
      company_id: companyId,
      fiscal_year: year,
      code: l.code,
      amount: valueOf(l.code, l.numbers),
    }));
    const { error: err } = await createClient()
      .from("financial_statements")
      .upsert(payload, { onConflict: "company_id,fiscal_year,code" });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
    onClose();
  }

  const th: React.CSSProperties = { padding: "6px 8px", fontSize: 10.5, color: "var(--text-3)", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "4px 8px", fontSize: 11.5, color: "var(--ink)", textAlign: "right", whiteSpace: "nowrap" };
  const inp: React.CSSProperties = { width: 120, padding: "4px 7px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11.5, fontFamily: "inherit", textAlign: "right", outline: "none", background: "var(--surface)", color: "var(--ink)" };

  return (
    <Modal
      title="Importer des états financiers"
      onClose={onClose}
      maxWidth={result ? 900 : 560}
      footer={
        result ? (
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>
              <b>{retained.length}</b> poste{retained.length > 1 ? "s" : ""} seront enregistrés sur l&apos;exercice <b>{year}</b>
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => setResult(null)}>Retour</button>
              <button className="btn btn-primary" onClick={save} disabled={busy || retained.length === 0}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={analyse} disabled={text.trim().length < 10}>Analyser</button>
          </div>
        )
      }
    >
      {!result ? (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 12 }}>
            Collez ici les états financiers, tels quels — depuis un PDF, un tableur ou un document Word.
            L&apos;analyse s&apos;appuie sur les <b>codes OHADA</b> imprimés en début de ligne (AE, BI, TA, RK…),
            bien plus fiables que les libellés. Rien n&apos;est enregistré : vous vérifierez ligne par ligne à l&apos;écran suivant.
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"AE  Frais de développement            1 200 000     900 000\nBI  Clients et comptes rattachés     45 300 000  38 100 000\nTA  Ventes de marchandises          210 000 000 185 000 000"}
            style={{ width: "100%", minHeight: 240, padding: 10, border: "1px solid var(--border)", borderRadius: 9, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", outline: "none", background: "var(--surface)", color: "var(--ink)", resize: "vertical", lineHeight: 1.5 }}
          />
        </div>
      ) : (
        <div style={{ padding: "14px 20px" }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <label style={{ fontSize: 11.5, color: "var(--text-2)" }}>
              Exercice{" "}
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)" }}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            {result.maxCols > 1 && (
              <label style={{ fontSize: 11.5, color: "var(--text-2)" }}>
                Colonne à importer{" "}
                <select value={pickKey(pick)} onChange={(e) => setPick(parsePickKey(e.target.value))}
                  style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 7, fontSize: 12, fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)" }}>
                  {columnOptions(result.maxCols).map((o) => <option key={pickKey(o.pick)} value={pickKey(o.pick)}>{o.label}</option>)}
                </select>
              </label>
            )}
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
              {inputLines.length} poste{inputLines.length > 1 ? "s" : ""} reconnu{inputLines.length > 1 ? "s" : ""}
              {totalLines.length > 0 && ` · ${totalLines.length} total${totalLines.length > 1 ? "aux" : ""} ignoré${totalLines.length > 1 ? "s" : ""}`}
            </span>
          </div>

          {inputLines.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", fontSize: 12.5, color: "var(--text-3)" }}>
              Aucun code OHADA reconnu. Vérifiez que les codes (AE, BI, TA…) figurent bien en début de ligne dans le texte collé.
            </div>
          ) : (
            <div style={{ maxHeight: "48vh", overflowY: "auto", border: "1px solid var(--border)", borderRadius: 9 }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, background: "var(--surface-cream)" }}>
                    <th style={{ ...th, textAlign: "left", width: 46 }}>Code</th>
                    <th style={{ ...th, textAlign: "left", width: "auto" }}>Poste</th>
                    <th style={{ ...th, textAlign: "left" }}>Valeurs détectées</th>
                    <th style={th}>Valeur retenue</th>
                    <th style={{ ...th, width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {inputLines.map((l) => {
                    const off = excluded.has(l.code);
                    const v = valueOf(l.code, l.numbers);
                    return (
                      <tr key={l.code} style={{ borderTop: "1px solid var(--sep)", opacity: off ? 0.4 : 1 }}>
                        <td style={{ ...td, textAlign: "left", color: "var(--camel)", fontWeight: 600 }}>{l.code}</td>
                        <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}>{l.label}</td>
                        <td style={{ ...td, textAlign: "left", color: "var(--text-3)", fontSize: 11 }}>
                          {l.numbers.map((n) => fmt(n)).join("   ·   ")}
                        </td>
                        <td style={{ padding: "3px 8px", textAlign: "right" }}>
                          <input
                            value={edited[l.code] ?? (v == null ? "" : String(v))}
                            onChange={(e) => setEdited((s) => ({ ...s, [l.code]: e.target.value }))}
                            style={{ ...inp, borderColor: v == null ? "var(--red-fg)" : "var(--border)" }}
                            inputMode="numeric"
                            disabled={off}
                          />
                        </td>
                        <td style={{ padding: "3px 4px", textAlign: "center" }}>
                          <button
                            onClick={() => setExcluded((s) => { const n = new Set(s); if (n.has(l.code)) n.delete(l.code); else n.add(l.code); return n; })}
                            title={off ? "Réintégrer cette ligne" : "Exclure cette ligne de l'import"}
                            style={{ border: "none", background: "transparent", cursor: "pointer", color: off ? "var(--camel)" : "var(--text-3)", padding: 2, display: "flex" }}>
                            {off
                              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {result.ignored.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <button onClick={() => setShowIgnored((s) => !s)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "var(--camel)" }}>
                {showIgnored ? "− Masquer" : "+ Voir"} les {result.ignored.length} ligne{result.ignored.length > 1 ? "s" : ""} non reconnue{result.ignored.length > 1 ? "s" : ""}
              </button>
              {showIgnored && (
                <div style={{ marginTop: 6, maxHeight: 130, overflowY: "auto", background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 8, padding: 8, fontSize: 10.5, color: "var(--text-3)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.6 }}>
                  {result.ignored.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 10, lineHeight: 1.6 }}>
            Les <b>totaux et soldes</b> repérés dans le document ne sont pas importés : l&apos;application les recalcule à partir des postes de saisie.
            Les <b>charges</b> sont reprises en <b>positif</b>, même imprimées entre parenthèses ou avec un signe : c&apos;est la convention de la grille, les formules les soustraient ensuite.
            Une valeur peut être corrigée à la main, une ligne exclue par la croix. L&apos;enregistrement <b>écrase</b> les montants déjà saisis pour l&apos;exercice choisi.
          </div>
          {error && <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--red-fg)" }}>Échec de l&apos;enregistrement : {error}</div>}
        </div>
      )}
    </Modal>
  );
}
