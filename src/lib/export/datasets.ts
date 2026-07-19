// Passerelle Excel — jeux de données exportables, puis réinjectables.
//
// L'objectif énoncé : « passer de l'outil vers Excel pour présenter à un bailleur ou à
// un entrepreneur, et réinjecter ce qui a été travaillé sous Excel ».
//
// Ce qui rend l'aller-retour sûr tient en trois règles :
//  1. la première colonne porte l'IDENTIFIANT de la ligne — sans clé stable, réinjecter
//     revient à deviner, et deviner sur des montants n'est pas acceptable ;
//  2. seules quelques colonnes sont modifiables ; les autres sont exportées pour la
//     lecture et ignorées au retour, ce qui est dit noir sur blanc dans le classeur ;
//  3. rien n'est écrit sans un écart affiché avant → après, validé à l'écran.

import { createClient } from "@/lib/supabase/server";
import type { Sheet } from "./xlsx";
import { parseAmount, parsePercent, parseDate, normalizeLabel } from "@/lib/import/table";

export type FieldType = "text" | "amount" | "percent" | "date" | "int";

export type DatasetColumn = {
  header: string;
  /** Colonne de la base ; absent = colonne de lecture seule (calculée ou jointe). */
  column?: string;
  type: FieldType;
  editable?: boolean;
  width?: number;
};

export type DatasetDef = {
  key: string;
  label: string;
  table: string;
  hint: string;
  columns: DatasetColumn[];
};

export const DATASETS: DatasetDef[] = [
  {
    key: "portefeuille",
    label: "Portefeuille",
    table: "portfolio_companies",
    hint: "Les participations et les entreprises accompagnées.",
    columns: [
      { header: "Identifiant", type: "text", width: 38 },
      { header: "Entreprise", column: "name", type: "text", editable: true, width: 28 },
      { header: "Secteur", type: "text", width: 26 },
      { header: "Programme", type: "text", width: 22 },
      { header: "Suivi", type: "text", width: 14 },
      { header: "Statut", column: "status", type: "text", editable: true, width: 14 },
      { header: "Date d'entrée", column: "invested_date", type: "date", editable: true, width: 14 },
      { header: "Investi (FCFA)", column: "invested_amount", type: "amount", editable: true, width: 16 },
      { header: "Détention (%)", column: "ownership_pct", type: "percent", editable: true, width: 14 },
      { header: "Valorisation (FCFA)", column: "current_valuation", type: "amount", editable: true, width: 18 },
    ],
  },
  {
    key: "pipeline",
    label: "Pipeline",
    table: "deals",
    hint: "Les dossiers à l'instruction.",
    columns: [
      { header: "Identifiant", type: "text", width: 38 },
      { header: "Dossier", column: "company_name", type: "text", editable: true, width: 30 },
      { header: "Étape", column: "stage", type: "text", editable: true, width: 18 },
      { header: "État", column: "deal_state", type: "text", editable: true, width: 12 },
      { header: "Montant (FCFA)", column: "amount", type: "amount", editable: true, width: 16 },
      { header: "Probabilité (%)", column: "probability", type: "int", editable: true, width: 14 },
      { header: "Date prévue", column: "expected_close", type: "date", editable: true, width: 14 },
      { header: "Source", column: "deal_source", type: "text", editable: true, width: 22 },
      { header: "Précision source", column: "deal_source_detail", type: "text", editable: true, width: 24 },
    ],
  },
];

export const datasetByKey = (key: string) => DATASETS.find((d) => d.key === key) ?? null;

const fmtDate = (v: unknown) => (v ? String(v).slice(0, 10) : null);

/** Construit le classeur d'un jeu de données : les lignes, puis le mode d'emploi. */
export async function buildDatasetSheets(def: DatasetDef): Promise<Sheet[]> {
  const supabase = await createClient();

  const rows: (string | number | null)[][] = [def.columns.map((c) => c.header)];

  if (def.key === "portefeuille") {
    const [{ data: cos }, { data: subs }, { data: progs }] = await Promise.all([
      supabase.from("portfolio_companies").select("id, name, status, tracking_type, invested_date, invested_amount, ownership_pct, current_valuation, primary_sub_sector_id, program_id").order("name"),
      supabase.from("sub_sectors").select("id, name"),
      supabase.from("programs").select("id, name"),
    ]);
    const subMap = new Map((subs ?? []).map((s) => [s.id as string, s.name as string]));
    const progMap = new Map((progs ?? []).map((p) => [p.id as string, p.name as string]));
    for (const c of cos ?? []) {
      rows.push([
        c.id as string,
        c.name as string,
        c.primary_sub_sector_id ? (subMap.get(c.primary_sub_sector_id as string) ?? null) : null,
        c.program_id ? (progMap.get(c.program_id as string) ?? null) : null,
        (c.tracking_type ?? "equity") === "equity" ? "Participation" : "Accélération",
        c.status as string,
        fmtDate(c.invested_date),
        c.invested_amount != null ? Number(c.invested_amount) : null,
        c.ownership_pct != null ? Number(c.ownership_pct) : null,
        c.current_valuation != null ? Number(c.current_valuation) : null,
      ]);
    }
  } else {
    const { data: deals } = await supabase
      .from("deals")
      .select("id, company_name, stage, deal_state, amount, probability, expected_close, deal_source, deal_source_detail")
      .order("company_name");
    for (const d of deals ?? []) {
      rows.push([
        d.id as string, d.company_name as string, d.stage as string, (d.deal_state as string) ?? null,
        d.amount != null ? Number(d.amount) : null,
        d.probability != null ? Number(d.probability) : null,
        fmtDate(d.expected_close), (d.deal_source as string) ?? null, (d.deal_source_detail as string) ?? null,
      ]);
    }
  }

  const editable = def.columns.filter((c) => c.editable).map((c) => c.header);
  const readOnly = def.columns.filter((c) => !c.editable && c.header !== "Identifiant").map((c) => c.header);

  const guide: Sheet = {
    name: "Mode d'emploi",
    widths: [46, 70],
    rows: [
      ["Point", "Ce qu'il faut savoir"],
      ["À quoi sert ce classeur", "Présenter les données hors de l'outil, et y réinjecter ce qui a été retravaillé."],
      ["Ne jamais toucher", "La colonne « Identifiant ». C'est elle qui permet de retrouver la ligne au retour ; effacée ou modifiée, la ligne est ignorée."],
      ["Ne pas ajouter de ligne", "Une ligne sans identifiant ne crée rien. Les créations se font dans l'outil."],
      ["Colonnes modifiables", editable.join(" · ")],
      ["Colonnes de lecture seule", readOnly.length ? readOnly.join(" · ") + " — modifiables uniquement dans l'outil." : "aucune"],
      ["Montants", "En FCFA, sans devise ni espace imposé : « 180000000 » comme « 180 000 000 » sont lus."],
      ["Dates", "JJ/MM/AAAA ou AAAA-MM-JJ."],
      ["Cellule vidée", "Vide un champ dans l'outil. Un champ vide n'est pas un zéro."],
      ["Retour dans l'outil", "Reporting & extraction → Passerelle Excel → déposer le fichier. Les écarts sont affichés avant d'être enregistrés."],
      ["Exporté le", new Date().toLocaleDateString("fr-FR")],
    ],
  };

  return [{ name: def.label, rows, widths: def.columns.map((c) => c.width ?? 18) }, guide];
}

// ---------------------------------------------------------------------------
// Réinjection

export type Change = {
  id: string;
  label: string;
  column: string;
  header: string;
  before: string | null;
  after: string | null;
  /** Valeur convertie, prête pour la base. */
  value: string | number | null;
};
export type DiffResult = {
  changes: Change[];
  unchanged: number;
  unknownRows: number;
  ignoredColumns: string[];
};

function convert(raw: string, type: FieldType): string | number | null {
  const s = raw.trim();
  if (s === "") return null;
  switch (type) {
    case "amount": return parseAmount(s);
    case "percent": return parsePercent(s);
    case "int": { const v = parseAmount(s); return v == null ? null : Math.round(v); }
    case "date": return parseDate(s);
    default: return s;
  }
}

/** Comparaison tolérante : « 180000000 » et « 180 000 000 » sont la même chose. */
function sameValue(before: unknown, after: string | number | null, type: FieldType): boolean {
  if (after == null) return before == null || before === "";
  if (before == null) return false;
  if (type === "text" || type === "date") return String(before).slice(0, type === "date" ? 10 : undefined) === String(after);
  return Math.abs(Number(before) - Number(after)) < 0.0001;
}

/**
 * Compare le classeur déposé à l'état de la base et rend les écarts.
 * NE MODIFIE RIEN : c'est l'écran de vérification qui décide.
 */
export async function diffDataset(def: DatasetDef, rows: string[][]): Promise<DiffResult> {
  const supabase = await createClient();

  const header = rows[0] ?? [];
  const body = rows.slice(1).filter((r) => r.some((c) => (c ?? "").trim() !== ""));

  // On retrouve les colonnes par leur libellé : l'utilisateur a pu en déplacer ou en cacher.
  const indexOf = (h: string) => header.findIndex((x) => normalizeLabel(x) === normalizeLabel(h));
  const idCol = indexOf("Identifiant");
  if (idCol < 0) return { changes: [], unchanged: 0, unknownRows: body.length, ignoredColumns: [] };

  const editableCols = def.columns.filter((c) => c.editable && c.column);
  const present = editableCols.map((c) => ({ def: c, at: indexOf(c.header) })).filter((x) => x.at >= 0);
  const ignoredColumns = header.filter((h, i) =>
    i !== idCol && (h ?? "").trim() !== "" && !present.some((p) => p.at === i));

  const ids = body.map((r) => (r[idCol] ?? "").trim()).filter(Boolean);
  const nameCol = def.key === "portefeuille" ? "name" : "company_name";
  const select = ["id", nameCol, ...editableCols.map((c) => c.column!)].join(", ");
  const { data: current } = ids.length
    ? await supabase.from(def.table).select(select).in("id", ids)
    : { data: [] as Record<string, unknown>[] };
  const byId = new Map((current ?? []).map((r) => [String((r as Record<string, unknown>).id), r as Record<string, unknown>]));

  const changes: Change[] = [];
  let unchanged = 0;
  let unknownRows = 0;

  for (const row of body) {
    const id = (row[idCol] ?? "").trim();
    const existing = id ? byId.get(id) : null;
    // Une ligne ajoutée à la main, ou dont l'identifiant a été abîmé, ne crée rien.
    if (!existing) { unknownRows++; continue; }

    for (const p of present) {
      const value = convert(row[p.at] ?? "", p.def.type);
      const before = existing[p.def.column!];
      if (sameValue(before, value, p.def.type)) { unchanged++; continue; }
      changes.push({
        id,
        label: String(existing[nameCol] ?? id),
        column: p.def.column!,
        header: p.def.header,
        before: before == null ? null : String(before).slice(0, p.def.type === "date" ? 10 : undefined),
        after: value == null ? null : String(value),
        value,
      });
    }
  }

  return { changes, unchanged, unknownRows, ignoredColumns };
}
