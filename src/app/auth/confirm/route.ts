import { type NextRequest, NextResponse } from "next/server";

// IMPORTANT : ne PAS valider (verifyOtp) le jeton ici, côté serveur.
// Les messageries (Outlook/Microsoft notamment) pré-ouvrent les liens pour les
// scanner ; une validation au GET consommerait le jeton à usage unique avant que
// l'utilisateur ne clique. On se contente donc de TRANSMETTRE le jeton à la page
// /reinitialiser, qui le validera côté navigateur (JS) — invisible pour les scanners.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/reinitialiser";

  if (token_hash && type) {
    const url = new URL(`${origin}${next}`);
    url.searchParams.set("token_hash", token_hash);
    url.searchParams.set("type", type);
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(`${origin}/login?erreur=lien`);
}
