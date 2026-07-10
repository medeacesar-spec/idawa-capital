import { createClient } from "@/lib/supabase/server";

export type DocRow = {
  id: string;
  title: string;
  category: string | null;
  linkedTo: string | null;
  createdAt: string | null;
};

export type DocumentsData = { documents: DocRow[]; categories: string[] };

export async function getDocumentsData(): Promise<DocumentsData> {
  const supabase = await createClient();
  const [docRes, coRes, dealRes] = await Promise.all([
    supabase.from("documents").select("id, title, category, company_id, deal_id, created_at").order("created_at", { ascending: false }),
    supabase.from("portfolio_companies").select("id, name"),
    supabase.from("deals").select("id, company_name"),
  ]);
  const coMap = new Map((coRes.data ?? []).map((c) => [c.id, c.name]));
  const dealMap = new Map((dealRes.data ?? []).map((d) => [d.id, d.company_name]));

  const documents: DocRow[] = (docRes.data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    linkedTo: d.company_id ? coMap.get(d.company_id) ?? null : d.deal_id ? dealMap.get(d.deal_id) ?? null : null,
    createdAt: d.created_at,
  }));

  const categories = Array.from(new Set(documents.map((d) => d.category).filter(Boolean))) as string[];
  return { documents, categories };
}
