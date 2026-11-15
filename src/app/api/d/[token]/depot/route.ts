import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { companyByToken } from "@/lib/reporting/portal";
import { DepositError, diff, monthHasData, parseWorkbook, type Line } from "@/lib/reporting/deposit";
import { SharePointError } from "@/lib/sharepoint/graph";
import { MAX_BYTES, addFile, checkFile } from "@/lib/sharepoint/write";

// Dépôt d'un fichier par le référent de l'entreprise (lien personnel).
//   - vérification immédiate : vrai classeur, Synthèse ERP présente et intacte, bon exercice, mois rempli ;
//   - versions : 1er dépôt de la période = V0 ; suivants = V1, V2… ;
//   - motif OBLIGATOIRE si des chiffres déjà déposés changent (sinon : 409 + liste des changements) ;
//   - fichier rangé dans « Idawa Depots » (ajout seul), chiffres lus conservés.

export const runtime = "nodejs";
const PERIOD = { mensuel: /^\d{4}-M(0[1-9]|1[0-2])$/, annuel: /^\d{4}$/, releve: /^\d{4}-T[1-4]$/ } as const;
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const bad = (error: string, status = 400, extra: object = {}) => NextResponse.json({ ok: false, error, ...extra }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const co = await companyByToken(token);
  if (!co) return bad("Lien invalide ou désactivé. Demandez un nouveau lien à Idawa Capital.", 403);
  const admin = createAdminClient();

  // Au plus 20 dépôts par heure et par entreprise.
  const { count } = await admin.from("deposits").select("id", { count: "exact", head: true })
    .eq("company_id", co.companyId).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= 20) return bad("Trop de dépôts en une heure. Réessayez plus tard.", 429);

  let form: FormData;
  try { form = await req.formData(); } catch { return bad("Envoi illisible. Le fichier ne doit pas dépasser 4 Mo."); }
  const kind = String(form.get("kind") ?? "") as keyof typeof PERIOD;
  const period = String(form.get("period") ?? "");
  const reason = String(form.get("reason") ?? "").trim().slice(0, 500);
  const file = form.get("file");
  if (!(kind in PERIOD) || !PERIOD[kind].test(period)) return bad("Période ou type de dépôt invalide.");
  if (!(file instanceof File)) return bad("Aucun fichier reçu.");
  if (file.size > MAX_BYTES) return bad("Le fichier dépasse 4 Mo.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileKind = kind === "releve" ? "pdf" : "xlsx";
  const refused = checkFile(bytes, file.name, fileKind);
  if (refused) return bad(refused);

  // Période attendue et déjà ouverte.
  const today = new Date().toISOString().slice(0, 10);
  if (kind === "mensuel") {
    const [y, m] = [Number(period.slice(0, 4)), Number(period.slice(6))];
    if (`${period.slice(0, 4)}-${period.slice(6)}-01` < co.setup.startsOn.slice(0, 7) + "-01") return bad("Cette période est antérieure au début du suivi.");
    const opens = new Date(Date.UTC(y, m - 1, Math.min(co.setup.openDay, 28))).toISOString().slice(0, 10);
    if (today < opens) return bad(`La période de ${MONTHS[m - 1]} ${y} n'est pas encore ouverte.`);
  }

  // Lecture et contrôles du classeur.
  let lines: Line[] = [];
  let warnings: string[] = [];
  if (kind !== "releve") {
    try {
      const p = parseWorkbook(Buffer.from(bytes), kind);
      lines = p.lines; warnings = p.warnings;
      if (kind === "mensuel") {
        const y = Number(period.slice(0, 4)), m = Number(period.slice(6));
        if (p.year && p.year !== y) return bad(`Ce classeur est celui de l'exercice ${p.year} : pour ${MONTHS[m - 1]} ${y}, déposez le classeur ${y}.`);
        if (!monthHasData(p, m)) return bad(`Le mois de ${MONTHS[m - 1]} est vide dans la Synthèse de votre fichier : avez-vous rempli ce mois ?`);
      }
      if (kind === "annuel" && p.model === "SYNTHESE_ERP_ANNUELLE_V2" && p.year && p.year !== Number(period)) {
        return bad(`Ce classeur s'arrête à l'exercice ${p.year} : pour l'exercice ${period}, indiquez ${period} comme « Dernier exercice » dans son Lisez-moi.`);
      }
    } catch (e) {
      if (e instanceof DepositError) return bad(e.message);
      throw e;
    }
  }

  // Version et comparaison avec ce qui a déjà été déposé.
  const { data: same } = await admin.from("deposits").select("version").eq("company_id", co.companyId).eq("kind", kind).eq("period", period)
    .order("version", { ascending: false }).limit(1);
  const version = same?.length ? (same[0].version as number) + 1 : 0;
  let changes: ReturnType<typeof diff> = [];
  if (kind !== "releve") {
    // Dernier dépôt du même exercice (mensuel) ou dernier dépôt annuel : ses colonnes déjà déclarées.
    let q = admin.from("deposits").select("id, period").eq("company_id", co.companyId).eq("kind", kind).order("created_at", { ascending: false }).limit(1);
    if (kind === "mensuel") q = q.like("period", `${period.slice(0, 4)}-M%`);
    const { data: prev } = await q;
    if (prev?.length) {
      const { data: pl } = await admin.from("deposit_lines").select("sheet, code, label, unit, vals").eq("deposit_id", prev[0].id);
      const prevLines: Line[] = (pl ?? []).map((l) => ({ sheet: l.sheet, code: l.code, label: l.label, unit: l.unit, values: l.vals as Line["values"] }));
      const lastCol = kind === "mensuel" ? Number((prev[0].period as string).slice(6)) : 7;
      changes = diff(prevLines, lines, lastCol);
      if (changes.length && !reason) {
        return bad("Des chiffres déjà déposés ont changé : indiquez en une ligne le motif de la correction.", 409, {
          needsReason: true, changesCount: changes.length,
          changes: changes.slice(0, 15).map((c) => ({ ...c, month: kind === "mensuel" ? MONTHS[c.col - 1] : `colonne ${c.col}` })),
        });
      }
    }
  }

  // Fichier rangé dans « Idawa Depots » (ajout seul), puis dépôt et chiffres enregistrés.
  try {
    // Lignes absentes du classeur de référence de l'entreprise (nouveau produit…) : signalées à l'équipe.
    let newCodes: string[] = [];
    if (kind === "mensuel" && lines.length) {
      const { data: model } = await admin.from("company_models").select("codes").eq("company_id", co.companyId).maybeSingle();
      if (model) {
        const known = new Set((model.codes as string[]) ?? []);
        newCodes = Array.from(new Set(lines.map((l) => l.code).filter((c) => !known.has(c))));
        if (newCodes.length) warnings = [...warnings, `Nouvelles lignes par rapport à votre classeur de référence : ${newCodes.slice(0, 12).join(", ")}${newCodes.length > 12 ? "…" : ""}. Idawa les validera.`];
      }
    }
    const w = await addFile({ companyId: co.companyId, companyName: co.companyName, kind, period, version, originalName: file.name,
      bytes, fileKind, origin: "depot" });
    const { data: dep, error } = await admin.from("deposits").insert({
      company_id: co.companyId, kind, period, version, write_id: w.id, original_name: file.name.slice(0, 200), size: bytes.length, sha256: w.sha256,
      reason: reason || null, changes: changes.slice(0, 300), changes_count: changes.length, warnings, new_codes: newCodes,
      ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null, user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    }).select("id").single();
    if (error || !dep) return bad("Fichier reçu, mais l'enregistrement a échoué : prévenez Idawa Capital.", 500);
    await admin.from("sharepoint_writes").update({ deposit_id: dep.id }).eq("id", w.id);
    for (let i = 0; i < lines.length; i += 500) {
      await admin.from("deposit_lines").insert(lines.slice(i, i + 500).map((l) => ({ deposit_id: dep.id, sheet: l.sheet, code: l.code, label: l.label, unit: l.unit, vals: l.values, meta: l.meta ?? null })));
    }
    return NextResponse.json({ ok: true, version, changesCount: changes.length, warnings });
  } catch (e) {
    return bad(e instanceof SharePointError ? e.message : "Erreur inattendue pendant l'enregistrement.", e instanceof SharePointError ? e.status : 500);
  }
}
