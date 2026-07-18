"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRolePermission } from "@/app/(app)/utilisateurs/actions";

type Role = { id: string; name: string; permissions: Record<string, string> | null };

const DOMAINS: { key: string; label: string }[] = [
  { key: "pipeline", label: "Pipeline" },
  { key: "portefeuille", label: "Portefeuille" },
  { key: "comites", label: "Comités" },
  { key: "reporting", label: "Reporting" },
  { key: "consolide", label: "Performance · ESG global" },
  { key: "contacts", label: "Répertoire contacts" },
  { key: "documents", label: "Documents" },
  { key: "partenaires", label: "Partenaires & LPs" },
  { key: "config", label: "Paramètres · Biblio. KPIs" },
  { key: "users", label: "Utilisateurs & rôles" },
];

const LEVELS = [
  { v: "E", t: "Édition", bg: "var(--green-bg)", fg: "var(--green-fg)" },
  { v: "V", t: "Validation", bg: "var(--amber-bg)", fg: "var(--amber-fg)" },
  { v: "L", t: "Lecture", bg: "var(--neutral-bg)", fg: "var(--neutral-fg)" },
  { v: "-", t: "—", bg: "transparent", fg: "var(--text-3)" },
];
const LV = Object.fromEntries(LEVELS.map((l) => [l.v, l]));

// Les huit rôles fournis ont été créés par un seul insert : ils partagent le même
// horodatage, donc aucun tri par date ne les départage et une ligne modifiée changeait
// de place sous les yeux de l'utilisateur. On fixe ici un ordre de lecture, du rôle le
// plus étendu au plus restreint ; les rôles créés ensuite suivent par ordre alphabétique.
const ROLE_ORDER = [
  "Administrateur", "Associé / Direction", "Chargé d'investissement", "Analyste",
  "Responsable ESG", "Responsable Financier", "Auditeur", "Observateur / LP",
];
function byRole(a: Role, b: Role) {
  const ia = ROLE_ORDER.indexOf(a.name), ib = ROLE_ORDER.indexOf(b.name);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.name.localeCompare(b.name, "fr");
}

export default function AccessMatrix({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [perms, setPerms] = useState<Record<string, Record<string, string>>>(
    Object.fromEntries(roles.map((r) => [r.id, { ...(r.permissions ?? {}) } as Record<string, string>]))
  );
  const [busyCell, setBusyCell] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function change(roleId: string, domain: string, level: string) {
    const prev = perms[roleId]?.[domain] ?? "-";
    if (prev === level) return;
    setErr(null);
    setBusyCell(roleId + domain);
    setPerms((p) => ({ ...p, [roleId]: { ...p[roleId], [domain]: level } })); // optimiste
    start(async () => {
      const res = await setRolePermission(roleId, domain, level);
      setBusyCell(null);
      if (res.error) {
        setErr(res.error);
        setPerms((p) => ({ ...p, [roleId]: { ...p[roleId], [domain]: prev } })); // annulation
      } else {
        router.refresh();
      }
    });
  }

  const th: React.CSSProperties = { padding: "9px 10px", fontSize: 11, fontWeight: 700, color: "var(--text-2)", textAlign: "center", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <h2 className="serif" style={{ fontSize: 17, color: "var(--espresso)", margin: 0 }}>Matrice des accès par rôle</h2>
        <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>Cliquez une cellule pour changer le niveau d'accès — enregistré aussitôt.</span>
      </div>
      {err && <div style={{ fontSize: 12.5, color: "var(--red-fg)", background: "var(--red-bg)", borderRadius: 8, padding: "9px 12px", marginBottom: 10 }}>{err}</div>}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, zIndex: 1 }}>Rôle</th>
                {DOMAINS.map((d) => <th key={d.key} style={th}>{d.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...roles].sort(byRole).map((r, i) => (
                <tr key={r.id}>
                  <td style={{ padding: "8px 10px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", borderTop: i === 0 ? "none" : "1px solid var(--sep)", position: "sticky", left: 0, background: "var(--surface)" }}>{r.name}</td>
                  {DOMAINS.map((d) => {
                    const lvl = perms[r.id]?.[d.key] ?? "-";
                    const meta = LV[lvl] ?? LV["-"];
                    const cellBusy = busyCell === r.id + d.key;
                    return (
                      <td key={d.key} style={{ padding: "6px 8px", textAlign: "center", borderTop: i === 0 ? "none" : "1px solid var(--sep)" }}>
                        <select
                          value={lvl}
                          disabled={pending}
                          onChange={(e) => change(r.id, d.key, e.target.value)}
                          title="Changer le niveau d'accès"
                          style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none", cursor: "pointer", textAlign: "center", textAlignLast: "center", fontFamily: "inherit", fontSize: 10.5, fontWeight: 600, padding: "4px 10px", borderRadius: 999, border: "1px solid transparent", background: meta.bg, color: meta.fg, opacity: cellBusy ? 0.5 : 1 }}
                        >
                          {LEVELS.map((l) => <option key={l.v} value={l.v}>{l.t}</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11, color: "var(--text-3)" }}>
        <span><b style={{ color: "var(--green-fg)" }}>Édition</b> : créer / modifier</span>
        <span><b style={{ color: "var(--amber-fg)" }}>Validation</b> : valider (comités)</span>
        <span><b style={{ color: "var(--text-2)" }}>Lecture</b> : consulter</span>
        <span><b>—</b> : aucun accès (masqué du menu)</span>
      </div>
    </div>
  );
}
