"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { traceAuth } from "@/lib/auth/trace";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("raison") === "inactivite") {
      setNotice("Vous avez été déconnecté après 30 minutes d'inactivité. Reconnectez-vous pour continuer.");
    }

    // Sortie de boucle : si une session valide existe déjà alors qu'on se trouve sur la
    // page de connexion, c'est que la navigation précédente n'a pas abouti — un cookie
    // abîmé, un retour arrière, une redirection perdue. Plutôt que de laisser
    // l'utilisateur ressaisir ses identifiants sans effet, on ouvre l'application.
    createClient().auth.getSession().then(({ data }) => {
      if (data.session) {
        setOpening(true);
        window.location.assign("/dashboard");
      }
    }).catch(() => {
      // Session illisible : on laisse le formulaire faire son travail.
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Une série d'échecs sur un compte est le premier signe d'une tentative d'intrusion.
        // Sans trace, elle serait totalement invisible.
        traceAuth("échec", { email });
        setError("Email ou mot de passe incorrect.");
        setLoading(false);
        return;
      }

      // Supabase ne conserve que la DERNIÈRE connexion : sans cet enregistrement, on ne
      // saurait jamais qui est venu ni à quelle fréquence. L'utilisateur est déjà dans la
      // réponse de connexion — inutile de redemander au serveur qui vient de répondre.
      // Appel NON ATTENDU : la trace part, la navigation aussi.
      traceAuth("connexion", { userId: data.user?.id ?? null, email });

      // L'ouverture du tableau de bord prend une à deux secondes : on le dit, plutôt que
      // de laisser un bouton « Connexion… » que l'on finit par croire figé.
      setOpening(true);

      // NAVIGATION PAR RECHARGEMENT COMPLET, et non router.push.
      //
      // Un push déclenche une navigation côté client : sa requête traverse le middleware,
      // qui rappelle getUser(). Si les cookies de session ne sont pas encore tous visibles
      // sur cette requête, le middleware renvoie vers /login — la page où l'on se trouve
      // déjà. Rien ne bouge alors à l'écran et le bouton reste figé sur « Connexion… ».
      // Un rechargement complet part avec les cookies posés : le middleware voit la session.
      window.location.assign("/dashboard");

      // Filet de sécurité très large : si la page n'est toujours pas ouverte, on propose
      // un lien direct plutôt que de laisser l'écran en suspens.
      setTimeout(() => setSlow(true), 15000);
    } catch {
      setError("La connexion n'a pas pu aboutir. Vérifiez votre accès à Internet et réessayez.");
      setLoading(false);
    }
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
            {opening ? "Ouverture du tableau de bord…" : loading ? "Connexion…" : "Se connecter"}
          </button>

          {opening && (
            <div style={{ fontSize: 12, color: "var(--text-2)", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
              Connexion réussie. La page s&apos;ouvre.
              {slow && (
                <>
                  {" "}Cela prend plus longtemps que prévu —{" "}
                  <a href="/dashboard" style={{ color: "var(--camel)", fontWeight: 600 }}>ouvrir le tableau de bord</a>.
                </>
              )}
            </div>
          )}
        </form>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a href="/mot-de-passe-oublie" style={{ fontSize: 12.5, color: "var(--camel)", fontWeight: 600, textDecoration: "none" }}>Mot de passe oublié ?</a>
        </div>
      </div>
    </div>
  );
}
