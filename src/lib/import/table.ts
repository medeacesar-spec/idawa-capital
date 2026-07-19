// Analyse d'un tableau brut : trouver la ligne d'en-tête, puis convertir les cellules.
//
// Le fichier d'un partenaire ne commence jamais ligne 1 colonne A : il y a un titre,
// parfois une ligne de consignes, des colonnes vides. Plutôt que de demander à
// l'utilisateur « à quelle ligne commencent vos données ? », on le devine et on lui
// montre ce qu'on a compris — il corrige d'un clic si l'on s'est trompé.
//
// Module PUR : aucune dépendance, utilisable côté client comme côté serveur.

export type RawTable = { rows: string[][] };

/** Découpe un copier-coller (tabulations, ou deux espaces = changement de colonne). */
export function parsePasted(text: string): string[][] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => (l.includes("\t") ? l.split("\t") : l.split(/ {2,}/)).map((c) => c.trim()));
}

/** Découpe un CSV en respectant les guillemets et les retours à la ligne internes. */
export function parseCsv(text: string, sep?: string): string[][] {
  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  // Séparateur deviné sur la première ligne : le point-virgule est la norme en France.
  const head = src.slice(0, src.indexOf("\n") === -1 ? src.length : src.indexOf("\n"));
  const s = sep ?? ((head.split(";").length > head.split(",").length) ? ";" : ",");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === s) { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ""));
}

const filled = (r: string[]) => r.filter((c) => c != null && String(c).trim() !== "").length;

/**
 * Devine l'index (base 0) de la ligne d'en-tête.
 * Critère : la première ligne bien remplie dont la SUIVANTE est remplie autant ou plus.
 * Un titre de document (« Liste des projets ») n'a qu'une cellule et se disqualifie seul.
 */
export function guessHeaderRow(rows: string[][]): number {
  const width = Math.max(1, ...rows.slice(0, 30).map(filled));
  for (let i = 0; i < Math.min(rows.length - 1, 30); i++) {
    const here = filled(rows[i]);
    const next = filled(rows[i + 1]);
    if (here >= Math.max(3, width * 0.6) && next >= here * 0.5) return i;
  }
  return 0;
}

export type Column = { index: number; header: string; samples: string[]; nonEmpty: number };

/** Colonnes exploitables : en-tête non vide et au moins une valeur en dessous. */
export function describeColumns(rows: string[][], headerRow: number): Column[] {
  const header = rows[headerRow] ?? [];
  const body = rows.slice(headerRow + 1);
  const width = Math.max(header.length, ...body.map((r) => r.length));
  const out: Column[] = [];

  for (let c = 0; c < width; c++) {
    const values = body.map((r) => (r[c] ?? "").trim()).filter((v) => v !== "");
    const head = (header[c] ?? "").trim();
    if (!head && values.length === 0) continue;
    out.push({
      index: c,
      header: head || `Colonne ${c + 1}`,
      samples: values.slice(0, 3),
      nonEmpty: values.length,
    });
  }
  return out;
}

/** Lignes de données réellement porteuses d'information. */
export function bodyRows(rows: string[][], headerRow: number): string[][] {
  return rows.slice(headerRow + 1).filter((r) => filled(r) > 0);
}

// ---------------------------------------------------------------------------
// Conversion des valeurs

/**
 * Montant écrit à la française : « 9 615 800,00 F CFA », « 1.200.000 », « 350 000 ».
 * Rend null si la cellule ne contient aucun chiffre — un champ vide n'est pas un zéro.
 */
export function parseAmount(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).replace(/[\u00a0\u202f\u2009]/g, " ").trim();
  if (s === "" || !/\d/.test(s)) return null;

  const negative = /^\(.*\)$/.test(s) || s.trim().startsWith("-");
  // On ne garde que chiffres et séparateurs, la devise et le texte partent.
  let n = s.replace(/[^\d.,\s']/g, "").trim();
  const lastComma = n.lastIndexOf(",");
  const lastDot = n.lastIndexOf(".");

  // Le dernier séparateur rencontré est le décimal s'il ne reste que 1 ou 2 chiffres après.
  const decimalAt = Math.max(lastComma, lastDot);
  const decimals = decimalAt >= 0 ? n.length - decimalAt - 1 : 0;
  if (decimalAt >= 0 && decimals > 0 && decimals <= 2) {
    n = n.slice(0, decimalAt).replace(/[^\d]/g, "") + "." + n.slice(decimalAt + 1).replace(/[^\d]/g, "");
  } else {
    n = n.replace(/[^\d]/g, "");
  }
  if (n === "" || n === ".") return null;
  const v = Number(n);
  return Number.isFinite(v) ? (negative ? -v : v) : null;
}

/** Pourcentage : « 83,33 % », « 0,83 », « 83 ». Rendu sur 100. */
export function parsePercent(raw: string): number | null {
  const v = parseAmount(raw);
  if (v == null) return null;
  // Un fichier écrit parfois 0,83 pour 83 % : au-dessous de 1 sans signe %, on convertit.
  if (!String(raw).includes("%") && v > 0 && v <= 1) return v * 100;
  return v;
}

/** Date en JJ/MM/AAAA, AAAA-MM-JJ, ou déjà convertie par le lecteur de classeur. */
export function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (fr) {
    const [, d, m, y] = fr;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/** Entier simple (effectifs, nombre d'années). */
export function parseCount(raw: string): number | null {
  const v = parseAmount(raw);
  return v == null ? null : Math.round(v);
}

/** « Oui » / « Non » / « x » / « true ». */
export function parseYesNo(raw: string): boolean | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "") return null;
  if (/^(oui|yes|o|y|x|vrai|true|1)$/.test(s)) return true;
  if (/^(non|no|n|faux|false|0)$/.test(s)) return false;
  return null;
}

/** Accents et casse retirés, pour comparer des libellés d'en-tête. */
export function normalizeLabel(s: string): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
