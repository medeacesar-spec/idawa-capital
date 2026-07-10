"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }
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
      </div>
    </div>
  );
}
