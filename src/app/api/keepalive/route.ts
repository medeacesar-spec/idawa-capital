import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Maintien en éveil de la base (14/11/2026). Sur l'offre gratuite, Supabase met en pause un
// projet sans activité pendant une semaine : l'application devient alors injoignable pour
// tout le monde. Une tâche GitHub (.github/workflows/base-eveil.yml) appelle cette adresse
// chaque jour. Une vraie requête part vers la base, avec la clé publique : aucune donnée
// n'est lue (les règles d'accès ne renvoient rien sans session) et rien n'est renvoyé.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("funds").select("id").limit(1);
  if (error) return NextResponse.json({ ok: false, error: "Base injoignable" }, { status: 503 });
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
