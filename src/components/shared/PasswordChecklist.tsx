"use client";

import { checkPassword } from "@/lib/password-policy";

// Checklist de composition qui s'actualise à la frappe. Tant que le champ est vide,
// on affiche les règles en gris (attendues) ; dès qu'on tape, chaque règle passe
// au vert (✓) ou reste en rouge (•). Utilisée sur l'écran Compte et sur /reinitialiser.
export default function PasswordChecklist({ value }: { value: string }) {
  const { results } = checkPassword(value);
  const touched = value.length > 0;
  return (
    <ul style={{ listStyle: "none", margin: "0 0 4px", padding: 0, display: "grid", gap: 4 }}>
      {results.map((r) => {
        const color = !touched ? "var(--text-3)" : r.met ? "var(--green-fg)" : "var(--red-fg)";
        const mark = !touched ? "•" : r.met ? "✓" : "✗";
        return (
          <li key={r.key} style={{ fontSize: 12, color, display: "flex", gap: 7, alignItems: "baseline" }}>
            <span style={{ fontWeight: 700, width: 10, flexShrink: 0 }}>{mark}</span>
            <span>{r.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
