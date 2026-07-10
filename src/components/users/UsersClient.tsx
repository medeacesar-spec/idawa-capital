"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/form";
import { inviteUser, setUserRole, deleteUser } from "@/app/(app)/utilisateurs/actions";

type User = { id: string; name: string; email: string; roleId: string | null; roleName: string };
type Role = { id: string; name: string };

function initials(name: string, email: string): string {
  const src = name || email;
  const parts = src.split(/[\s.@]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function UsersClient({ users, roles, currentUserId }: { users: User[]; roles: Role[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", roleId: roles.find((r) => r.name === "Analyste")?.id ?? roles[0]?.id ?? "" });
  const [result, setResult] = useState<{ tempPassword?: string; error?: string } | null>(null);

  function submitInvite() {
    setResult(null);
    start(async () => {
      const res = await inviteUser(form.email, form.roleId, form.name);
      if (res.error) setResult({ error: res.error });
      else { setResult({ tempPassword: res.tempPassword }); router.refresh(); }
    });
  }

  function changeRole(userId: string, roleId: string) {
    start(async () => { await setUserRole(userId, roleId); router.refresh(); });
  }

  function remove(u: User) {
    if (!confirm(`Supprimer l'accès de ${u.name || u.email} ?`)) return;
    start(async () => { await deleteUser(u.id); router.refresh(); });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}><b className="tnum" style={{ color: "var(--ink)" }}>{users.length}</b> utilisateur{users.length > 1 ? "s" : ""}</div>
        <button className="btn btn-primary" onClick={() => { setResult(null); setModal(true); }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Inviter un utilisateur
        </button>
      </div>

      <div className="card" style={{ padding: "4px 18px" }}>
        {users.map((u, i) => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: i === 0 ? "none" : "1px solid var(--sep)", flexWrap: "wrap" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--camel)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {initials(u.name, u.email)}
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{u.name || "—"} {u.id === currentUserId && <span style={{ fontSize: 10.5, color: "var(--text-3)", fontWeight: 400 }}>(vous)</span>}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{u.email}</div>
            </div>
            <Select value={u.roleId ?? ""} onChange={(e) => changeRole(u.id, e.target.value)} disabled={pending} style={{ width: 210 }}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
            <button onClick={() => remove(u)} disabled={u.id === currentUserId || pending} aria-label="Supprimer"
              style={{ border: "none", background: "none", cursor: u.id === currentUserId ? "not-allowed" : "pointer", color: "var(--text-3)", padding: 4, opacity: u.id === currentUserId ? 0.3 : 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title="Inviter un utilisateur" onClose={() => setModal(false)}
          footer={result?.tempPassword ? <button className="btn btn-primary" onClick={() => setModal(false)}>Terminé</button> : <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Annuler</button>
            <button className="btn btn-primary" disabled={pending || !form.email.trim()} onClick={submitInvite}>{pending ? "Création…" : "Créer le compte"}</button>
          </>}>
          {result?.tempPassword ? (
            <div>
              <div style={{ fontSize: 13, color: "var(--ink)", marginBottom: 12 }}>✅ Compte créé pour <b>{form.email}</b>.</div>
              <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 8 }}>Communiquez-lui ce mot de passe temporaire (il pourra le changer) :</div>
              <div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 600, background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", textAlign: "center", letterSpacing: 1, color: "var(--espresso)" }}>{result.tempPassword}</div>
            </div>
          ) : (
            <>
              <Field label="Nom complet"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Fabrice Sossou" /></Field>
              <Field label="Email"><Input type="email" value={form.email} autoFocus onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="prenom.nom@idawacapital.com" /></Field>
              <Field label="Rôle">
                <Select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </Field>
              {result?.error && <div style={{ fontSize: 12.5, color: "var(--red-fg)", background: "var(--red-bg)", borderRadius: 8, padding: "9px 12px" }}>{result.error}</div>}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
