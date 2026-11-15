import { NextResponse } from "next/server";
import path from "node:path";
import { getMyPermissions, can } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { fillTemplate, type CellValue } from "@/lib/export/fillTemplate";
import { natureOf } from "@/lib/reporting/deposit";

// « Télécharger le classeur à jour » : les classeurs d'Idawa (fondés sur ceux de Saint-André) remplis
// avec les entreprises suivies et leurs derniers dépôts. Rien à tenir à la main : la liste des
// entreprises et la page « Données » sont réécrites à chaque téléchargement.
export const runtime = "nodejs";

const T = (f: string) => path.join(process.cwd(), "src/assets/templates", f);
const FILES = {
  "1": { tpl: T("idawa-1-tableaux-de-bord.xlsx"), name: "1- Tableaux de bord EQUITY", monthly: true },
  "2": { tpl: T("idawa-2-performances-mensuelles.xlsx"), name: "2- Performances mensuelles", monthly: true },
  "3": { tpl: T("idawa-3-performances-annuelles.xlsx"), name: "3- Performances annuelles", monthly: false },
} as const;
const MAXE = 20;
type Dep = { id: string; company_id: string; period: string; version: number };

export async function GET(req: Request) {
  const { perms } = await getMyPermissions();
  if (!can(perms, "reporting", "L")) return new NextResponse("Accès refusé.", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const f = FILES[(sp.get("f") ?? "1") as keyof typeof FILES] ?? FILES["1"];
  const year = Number(sp.get("annee")) || new Date().getFullYear();
  const admin = createAdminClient();

  // Entreprises suivies (paramétrage du reporting), par ordre alphabétique.
  const { data: setups } = await admin.from("company_reporting_setup").select("company_id, expects_monthly, expects_annual");
  const ids = (setups ?? []).filter((s) => (f.monthly ? s.expects_monthly : s.expects_annual)).map((s) => s.company_id as string);
  const { data: cos } = ids.length ? await admin.from("portfolio_companies").select("id, name").in("id", ids) : { data: [] };
  const companies = (cos ?? []).map((c) => ({ id: c.id as string, name: (c.name as string).trim() })).sort((a, b) => a.name.localeCompare(b.name, "fr")).slice(0, MAXE);

  const fill: Record<string, Record<string, CellValue>> = { Entreprises: { C3: year } };
  companies.forEach((c, k) => { fill.Entreprises[`B${6 + k}`] = c.name; fill.Entreprises[`D${6 + k}`] = "oui"; });

  // Dernier dépôt de chaque entreprise pour un exercice donné (mensuel : la période la plus récente, puis la version).
  async function latest(kind: "mensuel" | "annuel", like: string): Promise<Map<string, Dep>> {
    const { data } = companies.length ? await admin.from("deposits").select("id, company_id, period, version").eq("kind", kind)
      .in("company_id", companies.map((c) => c.id)).like("period", like) : { data: [] };
    const best = new Map<string, Dep>();
    for (const d of (data ?? []) as Dep[]) {
      const b = best.get(d.company_id);
      if (!b || d.period > b.period || (d.period === b.period && d.version > b.version)) best.set(d.company_id, d);
    }
    return best;
  }
  async function linesOf(depIds: string[]) {
    const out: { deposit_id: string; code: string; label: string | null; unit: string | null; vals: (number | string | null)[]; meta: { nature?: string; onglet?: string; composition?: string } | null }[] = [];
    for (let i = 0; i < depIds.length; i += 50) {
      const { data } = await admin.from("deposit_lines").select("deposit_id, code, label, unit, vals, meta").in("deposit_id", depIds.slice(i, i + 50)).order("id");
      out.push(...((data ?? []) as typeof out));
    }
    return out;
  }
  const name = new Map(companies.map((c) => [c.id, c.name]));
  const rows: CellValue[][] = [];

  if (f.monthly) {
    for (const y of [year - 2, year - 1, year]) {
      const best = await latest("mensuel", `${y}-M%`);
      const deps = [...best.values()];
      const byDep = new Map(deps.map((d) => [d.id, d.company_id]));
      for (const l of await linesOf(deps.map((d) => d.id))) {
        const n = name.get(byDep.get(l.deposit_id)!)!;
        const vals = Array.from({ length: 12 }, (_, i) => { const v = l.vals?.[i]; return v === undefined ? null : v; });
        const onglet = l.meta?.onglet ?? (l.code.startsWith("BUD_") ? "Budget" : "Tableau de bord");
        rows.push([l.code, l.label, l.unit, ...vals, n, y, `${n}|${y}|${l.code}`, l.meta?.nature ?? natureOf(l.code), onglet, null, l.meta?.composition ?? null]);
      }
    }
    const buf = fillTemplate(f.tpl, fill, { "Données": { start: 4, rows } });
    return file(buf, `${f.name} – ${year}.xlsx`);
  }
  // Annuel : bloc « format liste » (entreprise, code, exercice, valeur, clé, source) à partir des dépôts annuels.
  const best = await latest("annuel", "%");
  const deps = [...best.values()];
  const byDep = new Map(deps.map((d) => [d.id, d]));
  for (const l of await linesOf(deps.map((d) => d.id))) {
    if (l.code.startsWith("EF_")) continue;                 // agrégats seulement (CA, EBE, RN…)
    const d = byDep.get(l.deposit_id)!; const n = name.get(d.company_id)!; const last = Number(d.period);
    (l.vals ?? []).forEach((v, i) => {
      const y = last - 6 + i;
      if (v !== null && v !== "" && v !== undefined) rows.push([n, l.code, y, v as CellValue, `${n}|${l.code}|${y}`, "Dépôt"]);
    });
  }
  const buf = fillTemplate(f.tpl, fill, { "Données annuelles": { start: 4, rows } });
  return file(buf, `${f.name} – ${year}.xlsx`);
}

function file(buf: Buffer, name: string) {
  return new NextResponse(new Uint8Array(buf), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
  } });
}
