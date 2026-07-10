export type CashFlow = { amount: number; date: string };

/** Taux de rendement interne sur flux datés (XIRR), par bissection — robuste. */
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const hasPos = flows.some((f) => f.amount > 0);
  const hasNeg = flows.some((f) => f.amount < 0);
  if (!hasPos || !hasNeg) return null;

  const t0 = Math.min(...flows.map((f) => new Date(f.date).getTime()));
  const yearsFrom = (d: string) => (new Date(d).getTime() - t0) / (365.25 * 86400000);
  const npv = (r: number) => flows.reduce((s, f) => s + f.amount / Math.pow(1 + r, yearsFrom(f.date)), 0);

  let lo = -0.9999, hi = 10;
  let flo = npv(lo), fhi = npv(hi);
  if (flo * fhi > 0) { hi = 1000; fhi = npv(hi); if (flo * fhi > 0) return null; }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (!isFinite(fm)) return null;
    if (Math.abs(fm) < 1e-7) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}
