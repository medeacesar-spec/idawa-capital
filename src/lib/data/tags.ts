import { createClient } from "@/lib/supabase/server";

// Tags de recherche : étiquettes rangées par familles, posées sur un dossier ou une société.
export type Tag = { id: string; name: string; family: string | null };

// Ordre d'affichage des familles ; une famille inconnue passe après, puis les tags sans famille.
export const TAG_FAMILIES = ["Filière", "Thématique", "Profil", "Zone", "PAEB", "IDERA", "Enabel"];

export function sortTags<T extends Tag>(tags: T[]): T[] {
  const rank = (f: string | null) => { const i = f ? TAG_FAMILIES.indexOf(f) : -1; return i === -1 ? (f ? 50 : 99) : i; };
  return [...tags].sort((a, b) => rank(a.family) - rank(b.family) || (a.family ?? "").localeCompare(b.family ?? "", "fr") || a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
}

/** Tous les tags existants (pour l'autocomplétion). */
export async function getAllTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("id, name, family");
  return sortTags((data ?? []) as Tag[]);
}

/** Tags d'une fiche. */
export async function getEntityTags(entityType: "deal" | "company", entityId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("entity_tags").select("tags(id, name, family)").eq("entity_type", entityType).eq("entity_id", entityId);
  return sortTags(((data ?? []).map((r) => r.tags).filter(Boolean) as unknown) as Tag[]);
}
