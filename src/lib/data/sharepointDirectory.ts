import { createClient } from "@/lib/supabase/server";
import { can, type Permissions } from "@/lib/auth/permissions";

// Page Documents : les dossiers SharePoint rattachés aux fiches, rangés comme l'application.
// La liste est calculée à chaque visite depuis la base : une fiche qu'on rattache à un dossier
// (bouton « Rattacher ») apparaît d'elle-même, un dossier qualifié pour un fonds change de
// groupe, un dossier converti passe au Portefeuille. Rien d'autre du site SharePoint n'est exposé.

export type SpEntry = {
  entityType: "deal" | "company";
  id: string;
  name: string;
  href: string;
  folderUrl: string | null;
  country: string | null;
  /** « Écarté », « Sorti », « Radié » : fiche close, montrée en fin de groupe. */
  closed: string | null;
  /** Autres groupes de la fiche (un dossier peut relever d'un fonds ET d'un programme). */
  alsoIn: string[];
};
export type SpGroup = { key: string; label: string; hint: string; color: string | null; entries: SpEntry[] };

const byName = (a: SpEntry, b: SpEntry) =>
  Number(!!a.closed) - Number(!!b.closed) || a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true });

export async function getSharePointDirectory(perms: Permissions): Promise<SpGroup[]> {
  const supabase = await createClient();
  const seeDeals = can(perms, "pipeline", "L");
  const seeCompanies = can(perms, "portefeuille", "L");

  const [dealRes, coRes, progRes, fundRes, memRes, convRes] = await Promise.all([
    seeDeals
      ? supabase.from("deals").select("id, company_name, fund_id, program_id, country, deal_state, sharepoint_folder_url").not("sharepoint_folder_id", "is", null)
      : Promise.resolve({ data: [] as never[] }),
    seeCompanies
      ? supabase.from("portfolio_companies").select("id, name, fund_id, program_id, country, status, sharepoint_folder_url").not("sharepoint_folder_id", "is", null)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("programs").select("id, name, color, position").order("position"),
    supabase.from("funds").select("id, name").order("created_at"),
    supabase.from("program_memberships").select("entity_type, entity_id, program_id").is("date_end", null),
    supabase.from("portfolio_companies").select("origin_deal_id").not("origin_deal_id", "is", null),
  ]);

  const programs = (progRes.data ?? []) as { id: string; name: string; color: string | null }[];
  const funds = (fundRes.data ?? []) as { id: string; name: string }[];
  const progName = new Map(programs.map((p) => [p.id, p.name]));
  const fundName = new Map(funds.map((f) => [f.id, f.name]));
  const memberships = new Map<string, Set<string>>();
  for (const m of (memRes.data ?? []) as { entity_type: string; entity_id: string; program_id: string }[]) {
    const k = `${m.entity_type}:${m.entity_id}`;
    if (!memberships.has(k)) memberships.set(k, new Set());
    memberships.get(k)!.add(m.program_id);
  }
  // Un dossier converti est suivi au Portefeuille : il ne figure plus dans le pipeline.
  const converted = new Set(((convRes.data ?? []) as { origin_deal_id: string }[]).map((c) => c.origin_deal_id));

  const groups = new Map<string, SpGroup>();
  const group = (key: string, label: string, hint: string, color: string | null = null) => {
    if (!groups.has(key)) groups.set(key, { key, label, hint, color, entries: [] });
    return groups.get(key)!;
  };
  // Ordre d'affichage : fonds, pipeline non qualifié, programmes, portefeuille.
  for (const f of funds) group(`fund:${f.id}`, `Pipeline – ${f.name}`, "Dossiers suivis pour le fonds");
  group("unqualified", "Pipeline non qualifié", "Dossiers rattachés à aucun fonds ni programme");
  for (const p of programs) group(`program:${p.id}`, p.name, "Entreprises suivies dans le programme", p.color);
  if (seeCompanies) group("portfolio", "Portefeuille", "Participations et entreprises accompagnées");

  type Row = { id: string; fund_id: string | null; program_id: string | null; country: string | null; sharepoint_folder_url: string | null };
  const place = (entityType: "deal" | "company", r: Row, name: string, closed: string | null, href: string) => {
    const progIds = new Set<string>(memberships.get(`${entityType}:${r.id}`) ?? []);
    if (r.program_id) progIds.add(r.program_id);
    const keys: string[] = [];
    if (entityType === "company") keys.push("portfolio");
    else {
      if (r.fund_id) keys.push(`fund:${r.fund_id}`);
      if (!r.fund_id && progIds.size === 0) keys.push("unqualified");
    }
    for (const p of progIds) if (progName.has(p)) keys.push(`program:${p}`);
    const labels = (k: string) => k === "portfolio" ? "Portefeuille" : k === "unqualified" ? "Non qualifié"
      : k.startsWith("fund:") ? fundName.get(k.slice(5)) ?? "Fonds" : progName.get(k.slice(8)) ?? "Programme";
    for (const k of keys) {
      const g = groups.get(k);
      if (!g) continue;
      g.entries.push({ entityType, id: r.id, name, href, folderUrl: r.sharepoint_folder_url, country: r.country, closed,
        alsoIn: keys.filter((x) => x !== k).map(labels) });
    }
  };

  for (const d of (dealRes.data ?? []) as (Row & { company_name: string; deal_state: string | null })[]) {
    if (converted.has(d.id)) continue;
    place("deal", d, d.company_name, d.deal_state === "Écarté" ? "Écarté" : null, `/pipeline/${d.id}`);
  }
  for (const c of (coRes.data ?? []) as (Row & { name: string; status: string | null })[]) {
    place("company", c, c.name, c.status === "Sorti" || c.status === "Radié" ? c.status : null, `/portefeuille/${c.id}`);
  }

  // Un groupe vide n'est montré que pour le Portefeuille (il se remplira à la conversion).
  return Array.from(groups.values())
    .map((g) => ({ ...g, entries: g.entries.sort(byName) }))
    .filter((g) => g.entries.length > 0 || g.key === "portfolio");
}
