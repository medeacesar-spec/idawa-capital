// Périodes de reporting. Deux cadences possibles selon le réglage du fonds :
//   · mensuelle     → « 2026-M07 »  (affichée « juil. 2026 »)
//   · trimestrielle → « 2026-T2 »   (affichée « T2 2026 »)
// L'annuel « 2025 » reste reconnu (états financiers OHADA).
//
// Volontairement SANS dépendance : ce fichier est importé par des composants clients,
// et tout import indirect du client Supabase serveur casserait la compilation.

export type Cadence = "mensuelle" | "trimestrielle";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function parse(period: string): { kind: "M" | "T" | "Y"; y: number; n: number } | null {
  let m = period.match(/^(\d{4})-M(\d{2})$/); if (m) return { kind: "M", y: +m[1], n: +m[2] };
  m = period.match(/^(\d{4})-T([1-4])$/); if (m) return { kind: "T", y: +m[1], n: +m[2] };
  m = period.match(/^(\d{4})$/); if (m) return { kind: "Y", y: +m[1], n: 0 };
  return null;
}

/** Période courante, dans la cadence demandée (trimestrielle par défaut, pour la rétro-compatibilité). */
export function currentPeriod(cadence: Cadence = "trimestrielle", d = new Date()): string {
  if (cadence === "mensuelle") return `${d.getFullYear()}-M${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${d.getFullYear()}-T${Math.floor(d.getMonth() / 3) + 1}`;
}

/** La période qui précède, quelle que soit sa cadence (déduite du format). */
export function previousPeriod(period: string): string {
  const p = parse(period);
  if (!p) return period;
  if (p.kind === "M") { const n = p.n === 1 ? 12 : p.n - 1, y = p.n === 1 ? p.y - 1 : p.y; return `${y}-M${String(n).padStart(2, "0")}`; }
  if (p.kind === "T") return p.n === 1 ? `${p.y - 1}-T4` : `${p.y}-T${p.n - 1}`;
  return `${p.y - 1}`;
}

/** La période qui suit. */
export function nextPeriod(period: string): string {
  const p = parse(period);
  if (!p) return period;
  if (p.kind === "M") { const n = p.n === 12 ? 1 : p.n + 1, y = p.n === 12 ? p.y + 1 : p.y; return `${y}-M${String(n).padStart(2, "0")}`; }
  if (p.kind === "T") return p.n === 4 ? `${p.y + 1}-T1` : `${p.y}-T${p.n + 1}`;
  return `${p.y + 1}`;
}

/** Adjectif de cadence déduit du format de la période : « mensuelle », « trimestrielle » ou « annuelle ». */
export function periodKindLabel(period: string): string {
  const p = parse(period);
  if (!p) return "";
  if (p.kind === "M") return "mensuelle";
  if (p.kind === "T") return "trimestrielle";
  return "annuelle";
}

/** Libellé lisible d'une période : « juil. 2026 », « T2 2026 » ou « 2025 ». */
export function formatPeriod(period: string): string {
  const p = parse(period);
  if (!p) return period;
  if (p.kind === "M") return `${MONTHS[p.n - 1] ?? "?"} ${p.y}`;
  if (p.kind === "T") return `T${p.n} ${p.y}`;
  return `${p.y}`;
}

/** N périodes glissantes en partant de `anchor` (incluse), vers le passé. */
export function rollingPeriods(anchor: string, count: number): string[] {
  const out: string[] = [];
  let cur = anchor;
  for (let i = 0; i < count; i++) { out.push(cur); cur = previousPeriod(cur); }
  return out;
}
