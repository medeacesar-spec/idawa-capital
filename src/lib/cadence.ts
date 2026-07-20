import type { Cadence } from "@/lib/periods";

// Réglage de cadence du fonds : un défaut global, surchargé au besoin par type de donnée.
export type CadenceDataType = "reporting" | "support" | "kpis" | "financials";
export type CadenceSettings = { default: Cadence } & Partial<Record<CadenceDataType, Cadence | null>>;

export const DEFAULT_CADENCE_SETTINGS: CadenceSettings = { default: "mensuelle" };

/** Cadence effective d'un type de donnée : sa surcharge si définie, sinon le défaut du fonds. */
export function resolveCadence(settings: CadenceSettings | null | undefined, type: CadenceDataType): Cadence {
  const s = settings ?? DEFAULT_CADENCE_SETTINGS;
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
