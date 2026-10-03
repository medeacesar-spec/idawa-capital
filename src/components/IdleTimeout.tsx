"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { traceAuth } from "@/lib/auth/trace";
import { ACTIVITY_KEY as KEY, IDLE_TIMEOUT_MS, idleDecision, readActivityCookie, recordActivity, sessionStartFromToken } from "@/lib/auth/idle";

const LOGOUT_KEY = "idawa:loggedOut";

export default function IdleTimeout() {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null); // secondes affichées, null = pas d'avertissement
  const loggingOut = useRef(false);
  const lastWrite = useRef(0);
  const memLast = useRef(0);       // repli si le stockage local est indisponible
  const signedInAt = useRef(0);    // date de la connexion en cours
  const ready = useRef(false);     // tant que la session n'est pas lue, on n'enregistre rien

  useEffect(() => {
    const supabase = createClient();
    const readLast = () => {
      let v = 0;
      try { v = parseInt(localStorage.getItem(KEY) ?? "0", 10) || 0; } catch {}
      return Math.max(v, readActivityCookie(), memLast.current);
    };
    const write = (t: number) => {
      memLast.current = t;
      recordActivity(t);
    };

    const logout = async () => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      setRemaining(null);
      try { localStorage.setItem(LOGOUT_KEY, String(Date.now())); } catch {}
      traceAuth("expiration");
      await supabase.auth.signOut({ scope: "local" });
      router.push("/login?raison=inactivite");
    };

    // Vérification : TOUJOURS avant d'enregistrer une activité. Au retour de veille ou sur un
    // onglet resté en arrière-plan, le contrôle périodique est suspendu par le navigateur ;
    // sans cette vérification, le premier mouvement de souris effaçait l'inactivité passée.
    const check = (): boolean => {
      if (loggingOut.current || !ready.current) return false;
      const now = Date.now();
      const d = idleDecision(now, readLast(), signedInAt.current);
      if (d === "logout") { logout(); return true; }
      if (d === "warn") {
        const ref = Math.max(readLast(), signedInAt.current);
        setRemaining(Math.max(1, Math.ceil((IDLE_TIMEOUT_MS - (now - ref)) / 1000)));
      } else setRemaining(null);
      return false;
    };

    const onActivity = () => {
      if (!ready.current || loggingOut.current) return;
      if (check()) return; // délai déjà dépassé : on déconnecte, on n'efface pas l'inactivité
      const t = Date.now();
      if (t - lastWrite.current > 2000) { lastWrite.current = t; write(t); } // limité pour ne pas spammer
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    // Retour sur l'onglet / la fenêtre : on contrôle tout de suite, sans attendre le minuteur.
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onVisible);

    // Au chargement : l'inactivité court depuis la dernière activité connue (même navigateur
    // fermé entre-temps), sauf si la connexion en cours est plus récente que cette activité.
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      signedInAt.current = Math.max(
        sessionStartFromToken(s?.access_token),
        Date.parse(s?.user?.last_sign_in_at ?? "") || 0,
      );
      ready.current = true;
      if (!check()) write(Date.now());
    });

    const interval = setInterval(check, 1000);

    const onStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_KEY && e.newValue && !loggingOut.current) {
        loggingOut.current = true;
        setRemaining(null);
        router.push("/login?raison=inactivite");
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, [router]);

  const stay = () => {
    const t = Date.now();
    lastWrite.current = t;
    memLast.current = t;
    recordActivity(t);
    setRemaining(null);
  };

  if (remaining === null) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(51,32,15,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div style={{ background: "var(--surface)", borderRadius: 14, padding: "26px 28px", maxWidth: 380, width: "100%", boxShadow: "0 12px 34px -12px rgba(74,38,23,.4)" }}>
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Toujours là ?</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 18 }}>
          Par sécurité, vous serez déconnecté pour inactivité dans <b className="tnum" style={{ color: "var(--ink)" }}>{remaining} s</b>.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={() => { setRemaining(null); loggingOut.current = false; createClient().auth.signOut({ scope: "local" }).then(() => router.push("/login")); }}>Se déconnecter</button>
          <button className="btn btn-primary" onClick={stay}>Rester connecté</button>
        </div>
      </div>
    </div>
  );
}
