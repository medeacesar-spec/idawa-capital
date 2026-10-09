import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVITY_COOKIE, serverIdleExpired, sessionStartFromToken } from "@/lib/auth/idle";
import { createAdminClient } from "@/lib/supabase/admin";

// Rafraîchit la session et protège toutes les pages sauf /login et /auth.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // `/api/auth-event` doit rester joignable SANS session : c'est là que s'enregistre un
  // échec de connexion, qui par définition survient avant toute session. Sans cette
  // exemption, la redirection transforme l'appel en POST sur /login, qui répond 405 —
  // et aucune tentative ratée n'est jamais consignée.
  const isPublic = path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/mot-de-passe-oublie") || path.startsWith("/reinitialiser") || path === "/api/auth-event"
    || path.startsWith("/q/") // questionnaire d'impact rempli par l'entrepreneur (accès par jeton)
    || path.startsWith("/c/") || path.startsWith("/api/c/"); // portail des membres extérieurs d'un comité (jeton)

  // Plus de 30 minutes sans activité -> session fermée ICI, avant tout affichage.
  // Le minuteur de la page ne suffit pas : un onglet oublié, un ordinateur en veille ou un
  // navigateur rouvert le lendemain reprenaient la session, l'application s'affichait, puis
  // la page déconnectait — on croyait se connecter pour être aussitôt éjecté.
  if (user && path !== "/api/auth-event") {
    const last = Number(request.cookies.get(ACTIVITY_COOKIE)?.value) || 0;
    const { data: { session } } = await supabase.auth.getSession();
    const start = sessionStartFromToken(session?.access_token);
    if (serverIdleExpired(Date.now(), last, start)) {
      try {
        await createAdminClient().from("auth_events").insert({
          kind: "expiration", user_id: user.id, email: user.email?.slice(0, 160) ?? null,
          ip: (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
          user_agent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
        });
      } catch {
        // La trace ne doit jamais empêcher la déconnexion.
      }
      await supabase.auth.signOut({ scope: "local" }); // révoque la session et efface ses cookies
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "?raison=inactivite";
      const res = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
      res.cookies.delete(ACTIVITY_COOKIE);
      return res;
    }
  }

  // Non connecté sur une page protégée -> connexion
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Déjà connecté et sur /login -> accueil
  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
