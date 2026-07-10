"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input } from "@/components/ui/form";

function Msg({ kind, text }: { kind: "ok" | "err"; text: string }) {
  return <div style={{ fontSize: 12.5, marginTop: 10, borderRadius: 8, padding: "9px 12px", color: kind === "ok" ? "var(--green-fg)" : "var(--red-fg)", background: kind === "ok" ? "var(--green-bg)" : "var(--red-bg)" }}>{text}</div>;
}

const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px", maxWidth: 520, marginBottom: 16 };
const h3: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "0 0 4px" };
const sub: React.CSSProperties = { fontSize: 12, color: "var(--text-3)", margin: "0 0 14px" };

export default function AccountClient({ userId, email, fullName, roleName }: { userId: string; email: string; fullName: string; roleName: string }) {
  const router = useRouter();

  const [name, setName] = useState(fullName);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function saveName() {
    if (!name.trim()) return;
    setNameBusy(true); setNameMsg(null);
    const { error } = await createClient().from("profiles").update({ full_name: name.trim() }).eq("id", userId);
    setNameBusy(false);
    if (error) setNameMsg({ kind: "err", text: "Échec : " + error.message });
    else { setNameMsg({ kind: "ok", text: "Nom mis à jour." }); router.refresh(); }
  }

  async function changePwd() {
    if (pwd.length < 8) { setPwdMsg({ kind: "err", text: "Le mot de passe doit contenir au moins 8 caractères." }); return; }
    if (pwd !== pwd2) { setPwdMsg({ kind: "err", text: "Les deux mots de passe ne correspondent pas." }); return; }
    setPwdBusy(true); setPwdMsg(null);
    const { error } = await createClient().auth.updateUser({ password: pwd });
    setPwdBusy(false);
    if (error) setPwdMsg({ kind: "err", text: "Échec : " + error.message });
    else { setPwdMsg({ kind: "ok", text: "Mot de passe modifié." }); setPwd(""); setPwd2(""); }
  }

  return (
    <div>
      <div style={card}>
        <h3 style={h3}>Identité</h3>
        <p style={sub}>Votre nom tel qu'il apparaît dans l'application, ainsi que votre e-mail et votre rôle.</p>
        <Field label="Nom complet"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Médéa Degbe" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 2 }}>
          <Field label="E-mail"><Input value={email} disabled /></Field>
          <Field label="Rôle"><Input value={roleName || "—"} disabled /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={nameBusy || !name.trim() || name.trim() === fullName} onClick={saveName}>{nameBusy ? "Enregistrement…" : "Enregistrer le nom"}</button>
        </div>
        {nameMsg && <Msg kind={nameMsg.kind} text={nameMsg.text} />}
      </div>

      <div style={card}>
        <h3 style={h3}>Mot de passe</h3>
        <p style={sub}>Choisissez un nouveau mot de passe (8 caractères minimum).</p>
        <Field label="Nouveau mot de passe"><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" /></Field>
        <Field label="Confirmer"><Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="••••••••" /></Field>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={pwdBusy || !pwd || !pwd2} onClick={changePwd}>{pwdBusy ? "Modification…" : "Changer le mot de passe"}</button>
        </div>
        {pwdMsg && <Msg kind={pwdMsg.kind} text={pwdMsg.text} />}
      </div>
    </div>
  );
}
