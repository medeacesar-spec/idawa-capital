"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { recordAuthEvent } from "@/app/auth-events";

const TIMEOUT_MS = 30 * 60 * 1000; // déconnexion après 30 min d'inactivité
const WARN_MS = 60 * 1000; // avertissement 1 min avant
const KEY = "idawa:lastActivity"; // partagé entre onglets
const LOGOUT_KEY = "idawa:loggedOut";

export default function IdleTimeout() {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null); // secondes affichées, null = pas d'avertissement
  const loggingOut = useRef(false);
  const lastWrite = useRef(0);

  useEffect(() => {
    const write = (t: number) => { try { localStorage.setItem(KEY, String(t)); } catch {} };
    write(Date.now());

    const onActivity = () => {
      const t = Date.now();
      if (t - lastWrite.current > 2000) { lastWrite.current = t; write(t); } // limité pour ne pas spammer
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const logout = async (reason: boolean) => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      try { localStorage.setItem(LOGOUT_KEY, String(Date.now())); } catch {}
      await recordAuthEvent("expiration");
      await createClient().auth.signOut({ scope: "local" });
      router.push(reason ? "/login?raison=inactivite" : "/login");
    };

    const interval = setInterval(() => {
      if (loggingOut.current) return;
      let last = 0;
      try { last = parseInt(localStorage.getItem(KEY) ?? "0", 10) || 0; } catch {}
      const idle = Date.now() - last;
      if (idle >= TIMEOUT_MS) { setRemaining(null); logout(true); }
      else if (idle >= TIMEOUT_MS - WARN_MS) setRemaining(Math.max(1, Math.ceil((TIMEOUT_MS - idle) / 1000)));
      else setRemaining(null);
    }, 1000);

    const onStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_KEY && e.newValue && !loggingOut.current) {
        loggingOut.current = true;
        router.push("/login?raison=inactivite");
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, [router]);

  const stay = () => {
    const t = Date.now();
    lastWrite.current = t;
    try { localStorage.setItem(KEY, String(t)); } catch {}
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
