import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Enregistrement des événements d'accès, par une route ordinaire et NON par une action
// serveur.
//
// Une action serveur renvoie une charge de rendu que Next applique avant de rendre la
// main : appelée juste avant de quitter la page de connexion, elle retardait la
// navigation de plusieurs secondes — mesuré à 4,2 s en production. L'écran paraissait
// gelé alors que l'authentification avait réussi.
//
// Une route rend un simple JSON. Elle peut être appelée sans être attendue, avec
// `keepalive`, de sorte que la trace parte même si la page se ferme aussitôt après.

const KINDS = new Set(["connexion", "échec", "déconnexion", "expiration", "mot de passe"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { kind?: string; userId?: string | null; email?: string | null };
    if (!body.kind || !KINDS.has(body.kind)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const h = await headers();
    // Derrière un proxy, l'adresse d'origine est la première de la liste.
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
    const userAgent = h.get("user-agent")?.slice(0, 200) ?? null;

    // Le service d'administration : l'écriture doit aboutir même sans session ouverte,
    // ce qui est précisément le cas d'un échec de connexion.
    await createAdminClient().from("auth_events").insert({
      kind: body.kind,
      user_id: body.userId ?? null,
      email: body.email ?? null,
      ip,
      user_agent: userAgent,
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Une trace manquante ne doit jamais empêcher de se connecter ou de se déconnecter.
    return NextResponse.json({ ok: false });
  }
}
