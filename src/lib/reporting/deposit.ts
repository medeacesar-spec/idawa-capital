// Lecture d'un classeur déposé par une entreprise (mensuel ou annuel) — SERVEUR UNIQUEMENT.
//
// On ne connaît aucun indicateur à l'avance : on lit toute ligne qui porte un CODE en colonne A
// (code, libellé, unité, puis 12 mois ou 7 exercices). La « Synthèse ERP » doit être présente et
// porter son repère de modèle ; elle ne doit contenir aucune erreur Excel (#REF!…).

import { readWorkbook, type SheetData } from "@/lib/import/xlsx";

export type Value = number | string | null;
export type Line = { sheet: string; code: string; label: string | null; unit: string | null; values: Value[] };
export type Parsed = {
  model: "SYNTHESE_ERP_V1" | "SYNTHESE_ERP_ANNUELLE_V1" | "SYNTHESE_ERP_V2" | "SYNTHESE_ERP_ANNUELLE_V2";
  year: number | null;          // exercice déclaré dans Paramètres (mensuel) / premier exercice (annuel)
  lines: Line[];
  warnings: string[];
};

const MODELS = {
  mensuel: { sheet: "Synthèse ERP", marker: "SYNTHESE_ERP_V1", ncols: 12, exclude: ["Lisez-moi", "Paramètres", "Dictionnaire"] },
  annuel: { sheet: "Synthèse ERP annuelle", marker: "SYNTHESE_ERP_ANNUELLE_V1", ncols: 7, exclude: ["Lisez-moi", "Paramètres", "Dictionnaire"] },
} as const;
const ERR = /^#(REF!|VALUE!|DIV\/0!|NAME\?|N\/A|NUM!|NULL!)$/;
const isCode = (s: string) => /^[A-Z][A-Z0-9_]*$/.test(s);
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export class DepositError extends Error {}

function cell(sheet: SheetData, r: number, c: number): string {
  return (sheet.rows[r - 1]?.[c - 1] ?? "").trim();
}
function toValue(s: string): Value {
  if (s === "") return null;
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && /^-?[\d\s.,]+(e-?\d+)?$/i.test(s) ? n : s;
}

// Version 2 (classeurs fondés sur les outils de Saint-André) : seule la page Synthèse est lue ; elle reprend
// d'elle-même toutes les lignes codées du tableau de bord (et du budget), quelle que soit leur position.
const MODELS_V2 = {
  mensuel: { sheet: "Synthèse ERP", marker: "SYNTHESE_ERP_V2", ncols: 12 },
  annuel: { sheet: "Synthèse ERP annuelle", marker: "SYNTHESE_ERP_ANNUELLE_V2", ncols: 7 },
} as const;

function parseV2(sheets: SheetData[], synth: SheetData, kind: "mensuel" | "annuel"): Parsed {
  const m = MODELS_V2[kind];
  for (let r = 1; r <= synth.rows.length; r++) {
    for (let c = 1; c <= Math.min(synth.rows[r - 1]?.length ?? 0, 3 + m.ncols); c++) {
      const v = cell(synth, r, c);
      if (ERR.test(v)) throw new DepositError(`La Synthèse contient une erreur (${v}) en ${String.fromCharCode(64 + c)}${r} — « ${cell(synth, r, 2) || cell(synth, r, 1)} ». Une ligne utilisée a sans doute été supprimée dans le tableau de bord.`);
    }
  }
  const y = Number(kind === "mensuel" ? cell(synth, 2, 3) : cell(synth, 3, 3 + m.ncols));
  const year = Number.isFinite(y) && y > 1990 ? y : null;
  const lines: Line[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (let r = 4; r <= synth.rows.length; r++) {
    const code = cell(synth, r, 1);
    if (!isCode(code)) continue;
    if (seen.has(code)) warnings.push(`Le code ${code} est utilisé deux fois dans le classeur.`);
    seen.add(code);
    const values = Array.from({ length: m.ncols }, (_, i) => toValue(cell(synth, r, 4 + i)));
    lines.push({ sheet: m.sheet, code, label: cell(synth, r, 2) || null, unit: cell(synth, r, 3) || null, values });
  }
  // écarts signalés par la page « Contrôles » du classeur
  const ctl = sheets.find((s) => s.name === "Contrôles");
  if (ctl) {
    let n = 0;
    for (const row of ctl.rows) for (const v of row) if ((v ?? "").trim() === "ÉCART") n++;
    if (n) warnings.push(`La page « Contrôles » du classeur signale ${n} écart${n > 1 ? "s" : ""} à corriger.`);
  }
  return { model: m.marker, year, lines, warnings: Array.from(new Set(warnings)).slice(0, 30) };
}

export function parseWorkbook(buf: Buffer, kind: "mensuel" | "annuel"): Parsed {
  const m = MODELS[kind];
  let sheets: SheetData[];
  try { sheets = readWorkbook(buf); } catch { throw new DepositError("Le fichier n'a pas pu être lu : est-ce bien le classeur Excel fourni par Idawa ?"); }
  const v2 = sheets.find((s) => s.name === MODELS_V2[kind].sheet && cell(s, 2, 1) === MODELS_V2[kind].marker);
  if (v2) return parseV2(sheets, v2, kind);
  const synth = sheets.find((s) => s.name === m.sheet);
  if (!synth) throw new DepositError(`L'onglet « ${m.sheet} » est absent : utilisez le classeur ${kind} fourni par Idawa, sans renommer ses onglets.`);
  if (cell(synth, 2, 1) !== m.marker) throw new DepositError(`L'onglet « ${m.sheet} » a été modifié ou provient d'un autre modèle : reprenez votre dernier fichier déposé.`);

  // Erreurs Excel dans la Synthèse = fichier inexploitable.
  for (let r = 1; r <= synth.rows.length; r++) {
    for (let c = 1; c <= (synth.rows[r - 1]?.length ?? 0); c++) {
      const v = cell(synth, r, c);
      if (ERR.test(v)) {
        const col = String.fromCharCode(64 + c);
        throw new DepositError(`La Synthèse contient une erreur (${v}) en ${col}${r} — « ${cell(synth, r, 2) || cell(synth, r, 1)} ». Une ligne utilisée a sans doute été supprimée dans un onglet détaillé.`);
      }
    }
  }

  const params = sheets.find((s) => s.name === "Paramètres");
  const yearRaw = params ? Number(cell(params, 5, 3)) : NaN;
  const year = Number.isFinite(yearRaw) && yearRaw > 1990 ? yearRaw : null;

  const lines: Line[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  for (const sh of sheets) {
    if ((m.exclude as readonly string[]).includes(sh.name)) continue;
    for (let r = 4; r <= sh.rows.length; r++) {
      const code = cell(sh, r, 1);
      const label = cell(sh, r, 2) || null;
      const values = Array.from({ length: m.ncols }, (_, i) => toValue(cell(sh, r, 4 + i)));
      const hasNumbers = values.some((v) => typeof v === "number");
      let finalCode = code;
      if (!isCode(code)) {
        if (!hasNumbers || !label || label.startsWith("＋")) continue;
        finalCode = `SANS_CODE_L${r}`;
        warnings.push(`Onglet « ${sh.name} », ligne ${r} (« ${label} ») : chiffres sans code en colonne A.`);
      }
      const key = `${sh.name}|${finalCode}`;
      if (seen.has(key)) warnings.push(`Onglet « ${sh.name} » : le code ${finalCode} est utilisé deux fois (lignes ${seen.get(key)} et ${r}).`);
      seen.set(key, r);
      for (const v of values) if (typeof v === "string" && ERR.test(v)) warnings.push(`Onglet « ${sh.name} », ${finalCode} : erreur ${v}.`);
      lines.push({ sheet: sh.name, code: finalCode, label, unit: cell(sh, r, 3) || null, values });
    }
  }
  for (const l of lines.filter((x) => x.sheet === m.sheet && x.code.startsWith("CTRL_"))) {
    l.values.forEach((v, i) => {
      if (typeof v === "string" && v && v !== "OK") warnings.push(`Contrôle « ${l.label ?? l.code} » : ${v} (${kind === "mensuel" ? MONTHS[i] : `colonne ${i + 1}`}).`);
    });
  }
  return { model: m.marker, year, lines, warnings: Array.from(new Set(warnings)).slice(0, 30) };
}

/** Le mois déposé doit contenir des chiffres (sinon on dépose un fichier vide ou le mauvais mois). */
export function monthHasData(p: Parsed, month: number): boolean {
  if (p.model === "SYNTHESE_ERP_V2") {
    // V2 : les lignes calculées (totaux, soldes reportés) ont une valeur même pour un mois vide ;
    // un mois est saisi si une ligne de ventes, d'encaissements ou de recettes est renseignée.
    return p.lines.some((l) => /^(VENTE_|TRESO_E_|REC_)/.test(l.code) && typeof l.values[month - 1] === "number");
  }
  const synth = p.lines.filter((l) => l.sheet === "Synthèse ERP" && !l.code.startsWith("CTRL_"));
  return synth.some((l) => typeof l.values[month - 1] === "number");
}

export type Change = { sheet: string; code: string; label: string | null; col: number; before: Value; after: Value };

/**
 * Changements entre deux versions sur les colonnes déjà déclarées (mois 1..lastCol).
 * Lignes disparues et lignes ajoutées sur ces colonnes comprises.
 */
export function diff(prev: Line[], next: Line[], lastCol: number): Change[] {
  const key = (l: Line) => `${l.sheet}|${l.code}`;
  const a = new Map(prev.map((l) => [key(l), l]));
  const b = new Map(next.map((l) => [key(l), l]));
  const out: Change[] = [];
  const eq = (x: Value, y: Value) => (x ?? null) === (y ?? null) || (typeof x === "number" && typeof y === "number" && Math.abs(x - y) < 0.005);
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const p = a.get(k), n = b.get(k);
    const ref = (n ?? p)!;
    if (ref.code.startsWith("CTRL_")) continue;
    for (let c = 0; c < lastCol; c++) {
      const before = p?.values[c] ?? null, after = n?.values[c] ?? null;
      if (!eq(before, after)) out.push({ sheet: ref.sheet, code: ref.code, label: ref.label, col: c + 1, before, after });
    }
  }
  return out;
}
