// Remplissage d'un classeur Excel EXISTANT, sans rien perdre de sa mise en page.
//
// Régénérer un classeur depuis zéro perd tout ce qui fait le document : cellules
// fusionnées, styles, logos, graphiques, formules, réglages d'impression — et, dans le
// modèle d'I&P, les deux pages « Fiche entreprise p.1 / p.2 » qui sont précisément la
// fiche lisible. On part donc du fichier d'origine et on n'y touche QUE les valeurs.
//
// Principe : un .xlsx est une archive ZIP. On la relit entrée par entrée, on réécrit les
// seules feuilles concernées, et on recopie tout le reste octet pour octet.
//
// Serveur uniquement (node:zlib, node:fs).

import { inflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { zipFiles } from "./xlsx";

export type CellValue = string | number | null;
/** Valeurs à écrire : nom de feuille -> référence de cellule -> valeur. */
export type Fill = Record<string, Record<string, CellValue>>;

type Entry = { name: string; data: Buffer };

function unzipAll(buf: Buffer): Entry[] {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66_000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Modèle illisible : archive .xlsx invalide.");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: Entry[] = [];

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    out.push({ name, data: method === 0 ? Buffer.from(raw) : inflateRawSync(raw) });
  }
  return out;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

/** « B12 » -> { col: "B", row: 12, index: 1 } */
function parseRef(ref: string): { col: string; row: number; index: number } {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) throw new Error(`Référence de cellule invalide : ${ref}`);
  let index = 0;
  for (const ch of m[1]) index = index * 26 + (ch.charCodeAt(0) - 64);
  return { col: m[1], row: Number(m[2]), index: index - 1 };
}

/** Écrit une cellule en CONSERVANT son style d'origine (`s`). */
function cellXml(ref: string, value: CellValue, style: string | null): string {
  const s = style ? ` s="${style}"` : "";
  if (value == null || value === "") return `<c r="${ref}"${s}/>`;
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"${s}><v>${value}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(String(value))}</t></is></c>`;
}

/**
 * Applique les valeurs à une feuille.
 *
 * Trois cas : la cellule existe (on garde son style, on remplace son contenu), la ligne
 * existe mais pas la cellule (on l'insère à sa place, l'ordre des cellules dans une ligne
 * étant significatif pour Excel), ou la ligne n'existe pas (on l'insère à son rang).
 */
function applyToSheet(xml: string, values: Record<string, CellValue>): string {
  const byRow = new Map<number, { ref: string; value: CellValue }[]>();
  for (const [ref, value] of Object.entries(values)) {
    const { row } = parseRef(ref);
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row)!.push({ ref, value });
  }

  let out = xml;

  for (const [rowNum, cells] of [...byRow].sort((a, b) => a[0] - b[0])) {
    const rowRe = new RegExp(`<row[^>]*\\sr="${rowNum}"[^>]*(?:/>|>[\\s\\S]*?</row>)`);
    const found = out.match(rowRe);

    if (!found) {
      // Ligne absente : on l'insère avant la première ligne de rang supérieur.
      const ordered = [...cells].sort((a, b) => parseRef(a.ref).index - parseRef(b.ref).index);
      const rowXml = `<row r="${rowNum}">${ordered.map((c) => cellXml(c.ref, c.value, null)).join("")}</row>`;
      const next = [...out.matchAll(/<row[^>]*\sr="(\d+)"/g)].find((m) => Number(m[1]) > rowNum);
      out = next
        ? out.slice(0, next.index!) + rowXml + out.slice(next.index!)
        : out.replace("</sheetData>", rowXml + "</sheetData>");
      continue;
    }

    let rowXml = found[0];
    // Une ligne auto-fermante n'a pas de contenu : on lui en donne un.
    if (rowXml.endsWith("/>")) rowXml = rowXml.slice(0, -2) + "></row>";

    for (const { ref, value } of cells) {
      const cellRe = new RegExp(`<c\\s[^>]*r="${ref}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`);
      const cur = rowXml.match(cellRe);

      if (cur) {
        const style = cur[0].match(/\ss="(\d+)"/)?.[1] ?? null;
        rowXml = rowXml.replace(cellRe, cellXml(ref, value, style));
      } else {
        // Cellule absente : insérée à sa position, l'ordre des colonnes fait foi.
        const idx = parseRef(ref).index;
        const after = [...rowXml.matchAll(/<c\s[^>]*r="([A-Z]+\d+)"/g)].find((m) => parseRef(m[1]).index > idx);
        const frag = cellXml(ref, value, null);
        rowXml = after
          ? rowXml.slice(0, after.index!) + frag + rowXml.slice(after.index!)
          : rowXml.replace("</row>", frag + "</row>");
      }
    }
    out = out.replace(rowRe, rowXml);
  }
  return out;
}

/**
 * Ouvre le modèle, y écrit les valeurs, rend le classeur complet.
 * Tout ce qui n'est pas une feuille modifiée est recopié tel quel : images, graphiques,
 * styles, mises en page.
 */
export function fillTemplate(templatePath: string, fill: Fill): Buffer {
  const entries = unzipAll(readFileSync(templatePath));

  const get = (name: string) => entries.find((e) => e.name === name)?.data.toString("utf8") ?? "";
  const workbook = get("xl/workbook.xml");
  const rels = get("xl/_rels/workbook.xml.rels");

  // Nom de feuille -> fichier, via l'identifiant de relation.
  const sheetFile = new Map<string, string>();
  for (const m of workbook.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g)) {
    const target = rels.match(new RegExp(`Id="${m[2]}"[^>]*Target="([^"]*)"`))?.[1];
    if (target) sheetFile.set(m[1], `xl/${target.replace(/^\/?xl\//, "")}`);
  }

  const out: { name: string; data: Buffer }[] = [];

  for (const e of entries) {
    // La chaîne de calcul décrit l'ordre d'évaluation des formules. Devenue fausse dès
    // qu'on touche une valeur, elle fait afficher à Excel un message de réparation :
    // on la retire, et le classeur se recalcule à l'ouverture.
    if (e.name === "xl/calcChain.xml") continue;

    if (e.name === "[Content_Types].xml") {
      out.push({ name: e.name, data: Buffer.from(e.data.toString("utf8").replace(/<Override[^>]*calcChain[^>]*\/>/g, ""), "utf8") });
      continue;
    }
    if (e.name === "xl/_rels/workbook.xml.rels") {
      out.push({ name: e.name, data: Buffer.from(e.data.toString("utf8").replace(/<Relationship[^>]*calcChain[^>]*\/>/g, ""), "utf8") });
      continue;
    }
    if (e.name === "xl/workbook.xml") {
      let xml = e.data.toString("utf8");
      // Demande explicite de recalcul complet à l'ouverture.
      xml = /<calcPr[^>]*\/>/.test(xml)
        ? xml.replace(/<calcPr[^>]*\/>/, '<calcPr calcId="191029" fullCalcOnLoad="1"/>')
        : xml.replace("</workbook>", '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
      out.push({ name: e.name, data: Buffer.from(xml, "utf8") });
      continue;
    }

    const sheetName = [...sheetFile].find(([, file]) => file === e.name)?.[0];
    if (sheetName && fill[sheetName]) {
      out.push({ name: e.name, data: Buffer.from(applyToSheet(e.data.toString("utf8"), fill[sheetName]), "utf8") });
      continue;
    }

    out.push({ name: e.name, data: e.data });
  }

  return zipFiles(out);
}
