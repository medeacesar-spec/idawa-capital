"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { recordAuthEvent } from "@/app/auth-events";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("raison") === "inactivite") {
      setNotice("Vous avez été déconnecté après 30 minutes d'inactivité. Reconnectez-vous pour continuer.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Une série d'échecs sur un compte est le premier signe d'une tentative d'intrusion.
      // Sans trace, elle serait totalement invisible.
      await recordAuthEvent("échec", { email });
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }
    // Supabase ne conserve que la DERNIÈRE connexion : sans cet enregistrement, on ne
    // saurait jamais qui est venu ni à quelle fréquence.
    const { data: { user } } = await supabase.auth.getUser();
    await recordAuthEvent("connexion", { userId: user?.id ?? null, email });
    router.push("/dashboard");
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 13px",
    border: "1px solid var(--border-strong)",
    borderRadius: 10,
    background: "var(--surface)",
    color: "var(--ink)",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cream)", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: "36px 34px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <Image src="/brand/wordmark-idawa.png" alt="Idawa Capital" width={150} height={48} style={{ width: 150, height: "auto" }} priority />
        </div>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-2)", margin: "0 0 26px" }}>
          Pilotage du pipeline et du portefeuille
        </p>

        {notice && (
          <div style={{ fontSize: 12.5, color: "var(--text-2)", background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 18, lineHeight: 1.5 }}>
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@idawacapital.com" style={{ ...inputStyle, marginBottom: 16 }} />

          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Mot de passe</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, marginBottom: 20 }} />

          {error && (
            <div style={{ fontSize: 12.5, color: "var(--red-fg)", background: "var(--red-bg)", borderRadius: 8, padding: "9px 12px", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 14, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a href="/mot-de-passe-oublie" style={{ fontSize: 12.5, color: "var(--camel)", fontWeight: 600, textDecoration: "none" }}>Mot de passe oublié ?</a>
        </div>
      </div>
    </div>
  );
}
