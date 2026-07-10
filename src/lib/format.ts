// Formatage des nombres et montants (FCFA)
const nf = new Intl.NumberFormat("fr-FR");

export function fmtInt(n: number): string {
  return nf.format(Math.round(n));
}

// Montant en millions de FCFA : 600000000 -> "600 M"
export function fmtM(n: number): string {
  return fmtInt(n / 1e6) + " M";
}

// Montant lisible : milliards ou millions
export function fmtFCFA(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2).replace(".", ",") + " Mrd";
  return fmtM(n);
}

export function fmtMult(n: number | null): string {
  return n == null ? "—" : n.toFixed(2).replace(".", ",") + "x";
}

export function fmtPct(n: number | null): string {
  return n == null ? "—" : Math.round(n) + " %";
}
