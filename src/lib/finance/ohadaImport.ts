// Analyseur d'états financiers OHADA — entrée « copier-coller ».
//
// Principe retenu (décision : import 100 % gratuit, aucune clé API, aucun service externe) :
// on s'accroche aux CODES OHADA imprimés en tête de ligne (AE, BI, TA, RK…) plutôt qu'aux
// libellés, qui varient d'un cabinet à l'autre. Le code est un point d'ancrage stable.
//
// L'analyseur ne décide jamais seul : il produit une proposition que l'utilisateur valide
// à l'écran, colonne par colonne, avant tout enregistrement.

import { OHADA_SECTIONS, type OhadaLine } from "./ohada";

export type ParsedLine = {
  code: string;
  label: string;          // libellé de NOTRE référentiel, pas celui du document collé
  kind: "input" | "total";
  numbers: number[];      // toutes les valeurs numériques trouvées sur la ligne
  raw: string;
};

export type ParseResult = {
  lines: ParsedLine[];
  maxCols: number;
  ignored: string[];      // lignes non reconnues, montrées à l'utilisateur pour contrôle
};

export type ColumnPick = { from: "left" | "right"; index: number };

const INDEX: Map<string, OhadaLine> = new Map(
  OHADA_SECTIONS.flatMap((s) => s.lines).map((l) => [l.code, l])
);

/**
 * Convertit un jeton numérique tel qu'imprimé en montant.
 * Gère les espaces (dont insécables), les séparateurs de milliers . , et ',
 * les parenthèses comptables (négatif) et les tirets valant zéro.
 */
export function parseAmount(token: string): number | null {
  const t = token.trim();
  if (!t) return null;
  if (/^[-–—.]$/.test(t)) return 0; // tiret comptable = néant

  const negative = /^\(.*\)$/.test(t) || /^-/.test(t);
  let body = t.replace(/^[-(]+/, "").replace(/[)]+$/, "");

  // Les montants sont en FCFA, donc entiers : une décimale à 1 ou 2 chiffres en fin de
  // jeton est une décimale d'affichage, on la retire avant de nettoyer les séparateurs.
  body = body.replace(/[.,]\d{1,2}$/, "");
  const digits = body.replace(/\D/g, "");
  if (!digits) return null;

  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

// Séparateurs de milliers admis À L'INTÉRIEUR d'un montant. Volontairement pas la classe des blancs :
// un espace multiple sépare deux colonnes, pas deux tranches de milliers — les confondre
// collerait « 1 200 000    300 000 » en un seul nombre.
const G = "[ \\u00A0\\u202F.,']";
// Soit un nombre en tranches de trois (1 200 000, 1.234.567), soit une suite de chiffres
// (850000) ; décimale d'affichage optionnelle en fin.
const NUMBER_TOKEN = new RegExp(`(?:\\d{1,3}(?:${G}\\d{3})+|\\d+)(?:[.,]\\d{1,2})?`, "g");

/** Découpe une ligne en cellules : deux espaces ou une tabulation marquent une colonne. */
function cells(rest: string): string[] {
  return rest.split(/\t|\s{2,}/).map((c) => c.trim()).filter(Boolean);
}

/** Montants d'une ligne, colonne par colonne, dans l'ordre d'impression. */
function amountsOf(rest: string): number[] {
  const out: number[] = [];
  for (const cell of cells(rest)) {
    // Une cellule réduite à un tiret vaut néant : on la compte pour ne pas décaler les colonnes.
    if (/^[-–—]$/.test(cell)) { out.push(0); continue; }
    // Une cellule peut contenir plusieurs montants accolés : « (98 500 000)(86 200 000) ».
    for (const part of cell.split(/(?=\()/)) {
      const found = part.match(NUMBER_TOKEN);
      if (!found) continue;
      const negative = part.trimStart().startsWith("(") || /^-/.test(part.trim());
      for (const tok of found) {
        const n = parseAmount(tok);
        if (n != null) out.push(negative ? -Math.abs(n) : n);
      }
    }
  }
  return out;
}

/** Cherche un code OHADA isolé dans la tête de ligne. */
function findCode(line: string): string | null {
  // On limite la recherche au début de ligne : plus loin, deux majuscules isolées
  // appartiennent au libellé (« TVA », « BIC »…) et non à la colonne des codes.
  const head = line.slice(0, 24);
  const tokens = head.match(/\b[A-Z]{2}\b/g);
  if (!tokens) return null;
  for (const t of tokens) if (INDEX.has(t)) return t;
  return null;
}

export function parseOhadaPaste(text: string): ParseResult {
  const lines: ParsedLine[] = [];
  const ignored: string[] = [];
  const seen = new Set<string>();
  let maxCols = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/ | /g, " ").trimEnd();
    if (!line.trim()) continue;

    const code = findCode(line);
    if (!code) {
      if (line.trim().length > 2) ignored.push(line.trim());
      continue;
    }
    // Un code ne peut être repris deux fois : on garde la première occurrence.
    if (seen.has(code)) continue;

    // On retire le code de la ligne avant d'y chercher les nombres, pour qu'un code
    // contenant des chiffres ne soit jamais confondu avec un montant.
    const rest = line.replace(new RegExp(`\\b${code}\\b`), " ");
    const numbers = amountsOf(rest);

    if (numbers.length === 0) continue; // ligne d'intitulé sans montant

    seen.add(code);
    const ref = INDEX.get(code)!;
    maxCols = Math.max(maxCols, numbers.length);
    lines.push({ code, label: ref.label, kind: ref.kind, numbers, raw: line.trim() });
  }

  return { lines, maxCols, ignored };
}

/** Valeur retenue pour une ligne selon la colonne choisie. */
export function pickColumn(numbers: number[], pick: ColumnPick): number | null {
  if (numbers.length === 0) return null;
  const i = pick.from === "left" ? pick.index : numbers.length - 1 - pick.index;
  return i >= 0 && i < numbers.length ? numbers[i] : null;
}

/** Intitulés des choix de colonne proposés à l'utilisateur. */
export function columnOptions(maxCols: number): { label: string; pick: ColumnPick }[] {
  const opts: { label: string; pick: ColumnPick }[] = [];
  for (let i = 0; i < maxCols; i++) opts.push({ label: `Colonne ${i + 1}`, pick: { from: "left", index: i } });
  opts.push({ label: "Dernière colonne", pick: { from: "right", index: 0 } });
  if (maxCols > 1) opts.push({ label: "Avant-dernière colonne", pick: { from: "right", index: 1 } });
  return opts;
}

export const pickKey = (p: ColumnPick) => `${p.from}:${p.index}`;
export const parsePickKey = (k: string): ColumnPick => {
  const [from, index] = k.split(":");
  return { from: from === "right" ? "right" : "left", index: Number(index) || 0 };
};
