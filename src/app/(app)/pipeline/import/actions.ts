"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyPermissions, can } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { readWorkbook } from "@/lib/import/xlsx";
import { parseCsv, parsePasted, guessHeaderRow, describeColumns, bodyRows, type Column } from "@/lib/import/table";
import { composedDescription, matchSubSector, type DealDraft } from "@/lib/import/pipelineMapping";

export type AnalyzedSheet = { name: string; rows: string[][] };
export type AnalyzeResult =
  | { error: string }
  | { sheets: AnalyzedSheet[]; sheetIndex: number; headerRow: number; columns: Column[]; dataCount: number };

/** Au-delà, le navigateur peinerait à afficher l'aperçu et l'import mérite d'être découpé. */
const MAX_ROWS = 5000;

/**
 * Lit un fichier déposé (.xlsx, .csv, .tsv, .txt) ou un texte collé, et rend son
 * contenu brut. AUCUNE écriture en base : cette étape ne fait que donner à voir.
 */
export async function analyzeImportSource(form: FormData): Promise<AnalyzeResult> {
  const { perms } = await getMyPermissions();
  if (!can(perms, "pipeline", "E")) return { error: "Vous n'avez pas le droit de créer des dossiers." };

  const pasted = String(form.get("pasted") ?? "").trim();
  const file = form.get("file");

  let sheets: AnalyzedSheet[] = [];

  if (pasted) {
    sheets = [{ name: "Texte collé", rows: parsePasted(pasted) }];
  } else if (file && typeof file === "object" && "arrayBuffer" in file) {
    const f = file as File;
    const name = f.name.toLowerCase();
    const buf = Buffer.from(await f.arrayBuffer());
    try {
      if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
        sheets = readWorkbook(buf).map((s) => ({ name: s.name, rows: s.rows }));
      } else if (/\.(csv|tsv|txt)$/.test(name)) {
        const text = buf.toString("utf8");
        sheets = [{ name: f.name, rows: name.endsWith(".tsv") ? parsePasted(text) : parseCsv(text) }];
      } else if (name.endsWith(".xls")) {
        return { error: "Le format .xls (ancien Excel) n'est pas lu. Enregistrez le fichier en .xlsx ou en .csv." };
      } else {
        return { error: "Format non reconnu. Formats acceptés : .xlsx, .csv, .tsv — ou un copier-coller." };
      }
    } catch (e) {
      return { error: `Fichier illisible : ${e instanceof Error ? e.message : "erreur inconnue"}` };
    }
  } else {
    return { error: "Aucun fichier ni texte fourni." };
  }

  sheets = sheets.filter((s) => s.rows.length > 0);
  if (!sheets.length) return { error: "Le fichier ne contient aucune ligne." };

  // La feuille retenue par défaut est la plus fournie : les classeurs de partenaires
  // trimballent souvent des onglets de paramètres ou de listes déroulantes.
  const sheetIndex = sheets.reduce((best, s, i, all) => (s.rows.length > all[best].rows.length ? i : best), 0);
  const rows = sheets[sheetIndex].rows;
  const headerRow = guessHeaderRow(rows);

  return {
    sheets: sheets.map((s) => ({ name: s.name, rows: s.rows.slice(0, MAX_ROWS + 50) })),
    sheetIndex,
    headerRow,
    columns: describeColumns(rows, headerRow),
    dataCount: bodyRows(rows, headerRow).length,
  };
}

export type ImportResult = { error: string } | { created: number; contacts: number; skipped: number };

/**
 * Crée les dossiers retenus. Écrit RÉELLEMENT en base — appelée uniquement depuis le
 * bouton de confirmation de l'écran de vérification.
 *
 * Le programme n'est délibérément PAS renseigné : un dossier importé entre non assigné
 * et se range ensuite depuis le pipeline. Rattacher automatiquement reviendrait à
 * décider à la place de l'utilisateur sur la foi d'un nom de fichier.
 */
export async function importDeals(drafts: DealDraft[]): Promise<ImportResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };
  const { perms } = await getMyPermissions();
  if (!can(perms, "pipeline", "E")) return { error: "Vous n'avez pas le droit de créer des dossiers." };

  const retained = drafts.filter((d) => d.companyName.trim() !== "");
  if (!retained.length) return { error: "Aucune ligne exploitable." };
  if (retained.length > MAX_ROWS) return { error: `Trop de lignes en une fois (${retained.length}). Découpez le fichier.` };

  const [{ data: fund }, { data: subSectors }] = await Promise.all([
    supabase.from("funds").select("id").limit(1).single(),
    supabase.from("sub_sectors").select("id, name"),
  ]);

  const rows = retained.map((d) => ({
    fund_id: fund?.id ?? null,
    company_name: d.companyName.trim(),
    description: composedDescription(d),
    thesis: d.thesis,
    amount: d.amount ?? 0,
    ownership_target: d.ownershipTarget,
    expected_close: d.expectedClose,
    primary_sub_sector_id: matchSubSector(d.sector, subSectors ?? []),
    deal_source_detail: d.sourceDetail,
    // Tout entre au Sourcing : qu'un partenaire ait « sélectionné » une PME ne dit rien
    // de l'avancement d'Idawa sur le dossier. C'est une base à instruire, pas un pipeline
    // déjà qualifié.
    stage: "Sourcing",
    deal_state: "Actif",
    // program_id volontairement absent : le rattachement se fait après l'import.
  }));

  const { data: created, error } = await supabase.from("deals").insert(rows).select("id, company_name");
  if (error) return { error: error.message };

  // Les contacts suivent les dossiers créés, dans le même ordre.
  const contacts = retained
    .map((d, i) => ({ d, dealId: created?.[i]?.id }))
    .filter(({ d, dealId }) => dealId && (d.contactName || d.contactEmail || d.contactPhone))
    .map(({ d, dealId }) => ({
      name: d.contactName?.trim() || d.companyName.trim(),
      email: d.contactEmail,
      phone: d.contactPhone,
      organization: d.companyName.trim(),
      org_type: "Pipeline",
      deal_id: dealId,
    }));

  let contactCount = 0;
  if (contacts.length) {
    const { data: madeContacts, error: cErr } = await supabase.from("contacts").insert(contacts).select("id");
    // Un contact manquant ne doit pas faire échouer l'import des dossiers déjà créés.
    if (!cErr) contactCount = madeContacts?.length ?? 0;
  }

  revalidatePath("/pipeline");
  return { created: created?.length ?? 0, contacts: contactCount, skipped: drafts.length - retained.length };
}
