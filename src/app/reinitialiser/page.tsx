"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const invalid = "Ce lien est invalide ou a expiré. Redemandez-en un depuis « Mot de passe oublié ».";
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) { setReady(true); setChecking(false); }
    });
    (async () => {
      try {
        const search = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = search.get("code");
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (search.get("error_description") || hash.get("error_description")) {
          setLinkError(invalid);
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setReady(true);
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          window.history.replaceState(null, "", window.location.pathname);
          setReady(true);
        } else {
          const { data } = await supabase.auth.getSession();
          if (data.session) setReady(true);
          else setLinkError(invalid);
        }
      } catch {
        setLinkError(invalid);
      } finally {
        setChecking(false);
      }
    })();
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (pwd !== pwd2) { setError("Les deux mots de passe ne correspondent pas."); return; }
    setBusy(true); setError(null);
    const { error } = await createClient().auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) { setError("Échec : " + error.message); return; }
    setDone(true);
    setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1500);
  }

  const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 13px", border: "1px solid var(--border-strong)", borderRadius: 10, background: "var(--surface)", color: "var(--ink)", fontSize: 14, fontFamily: "inherit", outline: "none" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cream)", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: "36px 34px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <Image src="/brand/wordmark-idawa.png" alt="Idawa Capital" width={150} height={48} style={{ width: 150, height: "auto" }} priority />
        </div>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-2)", margin: "0 0 26px" }}>Choisir un nouveau mot de passe</p>

        {checking ? (
          <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-3)" }}>Vérification du lien…</div>
        ) : done ? (
          <div style={{ fontSize: 13, color: "var(--green-fg)", background: "var(--green-bg)", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>✅ Mot de passe modifié. Redirection…</div>
        ) : linkError ? (
          <div>
            <div style={{ fontSize: 12.5, color: "var(--red-fg)", background: "var(--red-bg)", borderRadius: 8, padding: "11px 13px", lineHeight: 1.5 }}>{linkError}</div>
            <div style={{ textAlign: "center", marginTop: 18 }}><a href="/mot-de-passe-oublie" style={{ fontSize: 12.5, color: "var(--camel)", fontWeight: 600, textDecoration: "none" }}>Redemander un lien</a></div>
          </div>
        ) : ready ? (
          <form onSubmit={submit}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Nouveau mot de passe</label>
            <input type="password" required value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, marginBottom: 14 }} />
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Confirmer</label>
            <input type="password" required value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, marginBottom: 20 }} />
            {error && <div style={{ fontSize: 12.5, color: "var(--red-fg)", background: "var(--red-bg)", borderRadius: 8, padding: "9px 12px", marginBottom: 16 }}>{error}</div>}
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 14, opacity: busy ? 0.6 : 1 }}>{busy ? "Enregistrement…" : "Enregistrer le mot de passe"}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
