import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CADENCE_SETTINGS, type CadenceSettings } from "@/lib/cadence";

// Réglages du fonds (un seul fonds dans l'outil). Pour l'instant : la cadence de reporting.
export async function getFundSettings(): Promise<{ fundId: string | null; cadence: CadenceSettings }> {
  const supabase = await createClient();
  const { data } = await supabase.from("funds").select("id, reporting_cadence").limit(1).single();
  const cadence = (data?.reporting_cadence as CadenceSettings | null) ?? DEFAULT_CADENCE_SETTINGS;
  // Sécurité : garantir un défaut même si le jsonb est incomplet.
  return { fundId: (data?.id as string) ?? null, cadence: { ...cadence, default: cadence.default ?? "mensuelle" } };
}
