"use server";

import { createClient } from "@/lib/supabase/server";
import { getMyPermissions, can } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { readWorkbook } from "@/lib/import/xlsx";
import { parseCsv, guessHeaderRow } from "@/lib/import/table";
import { datasetByKey, diffDataset, type Change, type DiffResult } from "@/lib/export/datasets";

const domainOf = (key: string) => (key === "pipeline" ? "pipeline" : "portefeuille");

export type ReadResult = { error: string } | (DiffResult & { sheetName: string; rowCount: number });

/**
 * Lit le classeur retravaillé et rend les ÉCARTS avec la base. Aucune écriture :
 * l'utilisateur voit avant → après, puis décide.
 */
export async function readReinjection(form: FormData): Promise<ReadResult> {
  const key = String(form.get("dataset") ?? "");
  const def = datasetByKey(key);
  if (!def) return { error: "Jeu de données inconnu." };

  const { perms } = await getMyPermissions();
  if (!can(perms, domainOf(key), "E")) return { error: "Vous n'avez pas le droit de modifier ces données." };

  const file = form.get("file");
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) return { error: "Aucun fichier fourni." };

  const f = file as File;
  const buf = Buffer.from(await f.arrayBuffer());
  let rows: string[][];
  let sheetName = f.name;

  try {
    if (/\.(xlsx|xlsm)$/i.test(f.name)) {
      const sheets = readWorkbook(buf);
      // On reprend la feuille du jeu de données, pas le mode d'emploi.
      const target = sheets.find((s) => s.name === def.label) ?? sheets[0];
      if (!target) return { error: "Le classeur ne contient aucune feuille." };
      rows = target.rows;
      sheetName = target.name;
    } else if (/\.(csv|txt)$/i.test(f.name)) {
      rows = parseCsv(buf.toString("utf8"));
    } else {
      return { error: "Déposez le classeur .xlsx téléchargé, ou un CSV." };
    }
  } catch (e) {
    return { error: `Fichier illisible : ${e instanceof Error ? e.message : "erreur inconnue"}` };
  }

  // Le fichier a pu être retravaillé avec un titre au-dessus du tableau.
  const headerRow = guessHeaderRow(rows);
  const diff = await diffDataset(def, rows.slice(headerRow));
  return { ...diff, sheetName, rowCount: Math.max(0, rows.length - headerRow - 1) };
}

export type ApplyResult = { error: string } | { applied: number; rows: number };

/** Applique les écarts retenus. Écrit réellement — appelée depuis le bouton de confirmation. */
export async function applyReinjection(datasetKey: string, changes: Change[]): Promise<ApplyResult> {
  const def = datasetByKey(datasetKey);
  if (!def) return { error: "Jeu de données inconnu." };

  const { perms } = await getMyPermissions();
  if (!can(perms, domainOf(datasetKey), "E")) return { error: "Vous n'avez pas le droit de modifier ces données." };
  if (!changes.length) return { error: "Aucun écart à enregistrer." };

  // On ne fait confiance qu'aux colonnes déclarées modifiables : une liste d'écarts
  // fabriquée à la main ne doit pas pouvoir écrire ailleurs.
  const allowed = new Set(def.columns.filter((c) => c.editable && c.column).map((c) => c.column!));
  const rejected = changes.filter((c) => !allowed.has(c.column));
  if (rejected.length) return { error: `Colonne non modifiable : ${rejected[0].header}.` };

  // Un enregistrement par ligne, tous ses champs à la fois : le journal d'audit
  // consigne ainsi une modification par entité, et non une par cellule.
  const byId = new Map<string, Record<string, string | number | null>>();
  for (const c of changes) {
    if (!byId.has(c.id)) byId.set(c.id, {});
    byId.get(c.id)![c.column] = c.value;
  }

  const supabase = await createClient();
  let applied = 0;
  for (const [id, payload] of byId) {
    const { error } = await supabase.from(def.table).update(payload).eq("id", id);
    if (error) return { error: `Ligne ${id} : ${error.message}` };
    applied += Object.keys(payload).length;
  }

  revalidatePath(datasetKey === "pipeline" ? "/pipeline" : "/portefeuille");
  return { applied, rows: byId.size };
}
