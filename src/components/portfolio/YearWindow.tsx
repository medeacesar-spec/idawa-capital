"use client";

// Fenêtre glissante d'exercices : on garde TOUTES les années en mémoire, mais on n'en
// affiche que quelques-unes à la fois, avec des flèches pour faire défiler.
// Ajouter une année n'écrase donc plus les autres — elle s'ajoute et devient visible.

import { useState } from "react";

export const YEAR_WINDOW = 3;

export type YearWindow<T> = {
  all: T[];
  visible: T[];
  offset: number;
  max: number;
  canPrev: boolean;
  canNext: boolean;
  prev: () => void;
  next: () => void;
  /** Cale la fenêtre pour rendre visible l'année d'index `i` dans la liste complète. */
  reveal: (i: number, length: number) => void;
};

/**
 * `anchor` = où se place la fenêtre par défaut : "start" (début de liste) ou "end" (fin).
 * En tri décroissant, "start" montre les exercices les plus récents ;
 * en tri croissant, c'est "end" qui les montre.
 */
export function useYearWindow<T>(all: T[], anchor: "start" | "end", size = YEAR_WINDOW): YearWindow<T> {
  const [offset, setOffset] = useState<number | null>(null);
  const max = Math.max(0, all.length - size);
  const off = Math.min(Math.max(0, offset ?? (anchor === "start" ? 0 : max)), max);
  return {
    all,
    visible: all.slice(off, off + size),
    offset: off,
    max,
    canPrev: off > 0,
    canNext: off < max,
    prev: () => setOffset(Math.max(0, off - 1)),
    next: () => setOffset(Math.min(max, off + 1)),
    reveal: (i, length) => {
      const m = Math.max(0, length - size);
      setOffset(Math.min(Math.max(0, i - size + 1), m));
    },
  };
}

const arrow = (dir: "left" | "right") => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

export function YearNav<T>({ win, label = "exercices" }: { win: YearWindow<T>; label?: string }) {
  if (win.all.length <= win.visible.length) return null;
  const btn = (on: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
    borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--surface)",
    color: on ? "var(--espresso)" : "var(--text-3)", cursor: on ? "pointer" : "default",
    opacity: on ? 1 : 0.45, fontFamily: "inherit", padding: 0,
  });
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <button onClick={win.prev} disabled={!win.canPrev} style={btn(win.canPrev)} aria-label={`${label} précédents`} title={`${label} précédents`}>{arrow("left")}</button>
      <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
        {win.visible.length} sur {win.all.length} {label}
      </span>
      <button onClick={win.next} disabled={!win.canNext} style={btn(win.canNext)} aria-label={`${label} suivants`} title={`${label} suivants`}>{arrow("right")}</button>
    </div>
  );
}
