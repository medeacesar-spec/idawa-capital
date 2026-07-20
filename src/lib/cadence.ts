import type { Cadence } from "@/lib/periods";

// Réglage de cadence du fonds : un défaut global, surchargé au besoin par type de donnée,
// et — plus fin — par PROGRAMME (et par type au sein d'un programme).
//
// Hiérarchie de résolution pour un (programme, type) :
//   1. surcharge programme × type
//   2. défaut du programme
//   3. surcharge globale du type
//   4. défaut global du fonds  (mensuel)
export type CadenceDataType = "reporting" | "support" | "kpis" | "financials";
export type CadenceProgram = { default?: Cadence | null } & Partial<Record<CadenceDataType, Cadence | null>>;
export type CadenceSettings = { default: Cadence } & Partial<Record<CadenceDataType, Cadence | null>> & {
  byProgram?: Record<string, CadenceProgram>;
};

export const DEFAULT_CADENCE_SETTINGS: CadenceSettings = { default: "mensuelle" };

/** Cadence effective d'un type de donnée pour une entité, en tenant compte de son programme. */
export function resolveCadence(settings: CadenceSettings | null | undefined, type: CadenceDataType, programId?: string | null): Cadence {
  const s = settings ?? DEFAULT_CADENCE_SETTINGS;
  if (programId && s.byProgram && s.byProgram[programId]) {
    const p = s.byProgram[programId];
    if (p[type]) return p[type] as Cadence;
    if (p.default) return p.default;
  }
  return (s[type] as Cadence | null | undefined) || s.default || "mensuelle";
}

export const CADENCE_DATA_TYPES: { key: CadenceDataType; label: string }[] = [
  { key: "reporting", label: "Suivi de la remontée" },
  { key: "support", label: "Indicateurs d'accompagnement" },
  { key: "kpis", label: "KPIs métier" },
  { key: "financials", label: "Données financières (budget / réalisé)" },
];

export const CADENCES: { value: Cadence; label: string }[] = [
  { value: "mensuelle", label: "Mensuel" },
  { value: "trimestrielle", label: "Trimestriel" },
];
