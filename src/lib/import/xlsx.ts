// Lecture d'un classeur .xlsx SANS dépendance extérieure.
//
// Un .xlsx est une archive ZIP de fichiers XML. Node sait décompresser (zlib) et
// les feuilles suivent un format simple : une ligne <row>, des cellules <c r="B3" t="s">
// dont la valeur est soit un nombre, soit un renvoi vers la table des chaînes partagées.
// Écrire ces 150 lignes évite d'embarquer une bibliothèque de plusieurs mégaoctets
// dans une application qui n'a besoin que de LIRE des tableaux simples.
//
// Ce module s'exécute côté SERVEUR uniquement (il importe node:zlib).

import { inflateRawSync } from "node:zlib";

type ZipEntry = { name: string; data: Buffer };

/** Parcourt le répertoire central du ZIP et rend les fichiers demandés. */
function unzip(buf: Buffer, wanted: (name: string) => boolean): ZipEntry[] {
  // Fin du répertoire central : signature 0x06054b50, cherchée depuis la fin.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66_000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Fichier illisible : ce n'est pas une archive .xlsx valide.");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16); // début du répertoire central
  const out: ZipEntry[] = [];

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

    if (!wanted(name)) continue;

    // L'en-tête local répète les longueurs de nom et d'extra, qui peuvent différer.
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    out.push({ name, data: method === 0 ? raw : inflateRawSync(raw) });
  }
  return out;
}

const ENTITIES: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

function decodeXml(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|lt|gt|amp|quot|apos);/g, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(parseInt(e[1] === "x" ? e.slice(2) : e.slice(1), e[1] === "x" ? 16 : 10));
    return ENTITIES[e] ?? m;
  });
}

/** Table des chaînes partagées : toutes les cellules texte du classeur y renvoient. */
function readSharedStrings(xml: string): string[] {
  const out: string[] = [];
  // Une entrée <si> peut être découpée en plusieurs <t> (texte enrichi) : on recolle.
  for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
    const parts = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1]));
    out.push(parts.join(""));
  }
  return out;
}

/** « BC12 » -> 54 (index de colonne, base 0). */
function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

// Les dates Excel sont des nombres de jours depuis le 30/12/1899.
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const isDateFormat = (fmt: string) => /[dmyh]/i.test(fmt) && !/^[@#0.,%\s]*$/.test(fmt);

/** Formats de date intégrés à Excel, qui n'apparaissent pas dans styles.xml. */
const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

function readDateStyles(stylesXml: string): Set<number> {
  const customDateFormats = new Set<number>();
  for (const m of stylesXml.matchAll(/<numFmt[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
    if (isDateFormat(decodeXml(m[2]))) customDateFormats.add(Number(m[1]));
  }
  // cellXfs = les styles réellement appliqués aux cellules, dans l'ordre de leur index.
  const cellXfs = stylesXml.match(/<cellXfs[\s\S]*?<\/cellXfs>/)?.[0] ?? "";
  const dateStyles = new Set<number>();
  [...cellXfs.matchAll(/<xf[^>]*numFmtId="(\d+)"[^>]*\/?>/g)].forEach((m, i) => {
    const id = Number(m[1]);
    if (BUILTIN_DATE_FORMATS.has(id) || customDateFormats.has(id)) dateStyles.add(i);
  });
  return dateStyles;
}

export type SheetData = { name: string; rows: string[][] };

/**
 * Lit toutes les feuilles d'un classeur et rend leurs cellules en TEXTE.
 * Le texte est volontaire : l'écran de vérification montre à l'utilisateur ce qui
 * était écrit dans le fichier, et la conversion en nombre ou en date se fait ensuite,
 * champ par champ, là où l'on sait ce que la colonne représente.
 */
export function readWorkbook(buf: Buffer): SheetData[] {
  const entries = unzip(buf, (n) =>
    n === "xl/workbook.xml" || n === "xl/sharedStrings.xml" || n === "xl/styles.xml" || n.startsWith("xl/worksheets/sheet"));
  const get = (name: string) => entries.find((e) => e.name === name)?.data.toString("utf8") ?? "";

  const shared = readSharedStrings(get("xl/sharedStrings.xml"));
  const dateStyles = readDateStyles(get("xl/styles.xml"));

  // Les noms de feuilles vivent dans workbook.xml, dans l'ordre des fichiers sheetN.xml.
  const names = [...get("xl/workbook.xml").matchAll(/<sheet[^>]*name="([^"]*)"/g)].map((m) => decodeXml(m[1]));

  const sheetFiles = entries
    .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
    .sort((a, b) => Number(a.name.match(/\d+/)![0]) - Number(b.name.match(/\d+/)![0]));

  return sheetFiles.map((file, i) => {
    const xml = file.data.toString("utf8");
    const rows: string[][] = [];

    for (const rowXml of xml.match(/<row[^>]*>[\s\S]*?<\/row>/g) ?? []) {
      const rowNum = Number(rowXml.match(/<row[^>]*\sr="(\d+)"/)?.[1] ?? rows.length + 1);
      const cells: string[] = [];

      // Une cellule vide s'écrit en balise AUTO-FERMANTE (`<c r="I5"/>`), et Excel en
      // produit beaucoup. Ne reconnaître que la forme `<c …>…</c>` faisait consommer la
      // cellule suivante comme contenu de la cellule vide : toute la ligne se décalait
      // d'une colonne, et un montant atterrissait dans la colonne d'à côté.
      for (const c of rowXml.matchAll(/<c([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const ref = attrs.match(/\sr="([A-Z]+\d+)"/)?.[1];
        const type = attrs.match(/\st="(\w+)"/)?.[1] ?? "n";
        const style = Number(attrs.match(/\ss="(\d+)"/)?.[1] ?? -1);
        const body = c[2] ?? ""; // vide sur une balise auto-fermante

        let value = "";
        if (type === "inlineStr") {
          value = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");
        } else {
          const raw = decodeXml(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
          if (type === "s") value = shared[Number(raw)] ?? "";
          else if (type === "b") value = raw === "1" ? "Oui" : "Non";
          else if (raw !== "" && dateStyles.has(style) && !Number.isNaN(Number(raw))) {
            value = new Date(EXCEL_EPOCH + Number(raw) * 86_400_000).toISOString().slice(0, 10);
          } else value = raw;
        }
        cells[ref ? colIndex(ref) : cells.length] = value;
      }

      // Les lignes vides ne figurent pas toujours dans le XML : on comble les trous
      // pour que l'indice de ligne affiché corresponde à celui vu dans Excel.
      while (rows.length < rowNum - 1) rows.push([]);
      for (let k = 0; k < cells.length; k++) if (cells[k] === undefined) cells[k] = "";
      rows.push(cells);
    }
    return { name: names[i] ?? `Feuille ${i + 1}`, rows };
  });
}
