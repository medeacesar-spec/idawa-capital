// Calendrier des dépôts d'une entreprise (pur, utilisable côté client).
//
// Mois M : ouverture le jour `open_day` de M (le 25 par défaut), échéance le jour `due_day`
// du mois suivant (le 10), plus les jours accordés à l'avance pour les mois de haute saison.
// Exercice N : échéance le `annual_due_day`/`annual_due_month` de N+1 (30 avril par défaut).

export type SeasonalShift = { months: number[]; extra_days: number };
export type ReportingSetup = {
  companyId: string;
  referentName: string | null;
  referentEmail: string | null;
  referentPhone: string | null;
  chargeId: string | null;
  suppleantId: string | null;
  expectsMonthly: boolean;
  expectsAnnual: boolean;
  openDay: number;
  dueDay: number;
  annualDueMonth: number;
  annualDueDay: number;
  seasonalShifts: SeasonalShift[];
  tokenRevoked: boolean;
  /** Premier mois suivi (AAAA-MM-JJ, 1er du mois) : rien n'est attendu avant. */
  startsOn: string;
};

export const DEFAULT_SETUP: Omit<ReportingSetup, "companyId"> = {
  referentName: null, referentEmail: null, referentPhone: null, chargeId: null, suppleantId: null,
  expectsMonthly: true, expectsAnnual: true, openDay: 25, dueDay: 10, annualDueMonth: 4, annualDueDay: 30,
  seasonalShifts: [], tokenRevoked: false, startsOn: new Date().toISOString().slice(0, 8) + "01",
};

export type PeriodState = "à venir" | "ouverte" | "en retard";
export type CalendarPeriod = { period: string; label: string; kind: "mensuel" | "annuel"; opens: string; due: string; extraDays: number; state: PeriodState };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dateUTC = (y: number, m: number, d: number) => {
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();       // m : 0..11 ; jour borné au dernier du mois
  return new Date(Date.UTC(y, m, Math.min(d, last)));
};

export function extraDaysFor(setup: Pick<ReportingSetup, "seasonalShifts">, month: number): number {
  return setup.seasonalShifts.filter((s) => s.months.includes(month)).reduce((n, s) => Math.max(n, s.extra_days || 0), 0);
}

function state(opens: string, due: string, today: string): PeriodState {
  if (today < opens) return "à venir";
  return today > due ? "en retard" : "ouverte";
}

/** Périodes de l'année civile `year` (mensuelles et/ou annuelle de l'exercice year-1). */
export function calendarFor(setup: ReportingSetup, year: number, today = iso(new Date())): CalendarPeriod[] {
  const out: CalendarPeriod[] = [];
  if (setup.expectsMonthly) {
    for (let m = 0; m < 12; m++) {
      if (`${year}-${String(m + 1).padStart(2, "0")}-01` < setup.startsOn.slice(0, 8) + "01") continue;
      const opens = dateUTC(year, m, setup.openDay);
      const extra = extraDaysFor(setup, m + 1);
      const due = dateUTC(year, m + 1, setup.dueDay);
      due.setUTCDate(due.getUTCDate() + extra);
      out.push({ period: `${year}-M${String(m + 1).padStart(2, "0")}`, label: `${MONTHS[m]} ${year}`, kind: "mensuel",
        opens: iso(opens), due: iso(due), extraDays: extra, state: state(iso(opens), iso(due), today) });
    }
  }
  // L'exercice N-1 n'est attendu que si le suivi avait commencé avant la fin de cet exercice.
  if (setup.expectsAnnual && setup.startsOn <= `${year - 1}-12-31`) {
    const opens = dateUTC(year, 0, 1);
    const due = dateUTC(year, setup.annualDueMonth - 1, setup.annualDueDay);
    out.push({ period: String(year - 1), label: `Exercice ${year - 1}`, kind: "annuel", opens: iso(opens), due: iso(due), extraDays: 0, state: state(iso(opens), iso(due), today) });
  }
  return out.sort((a, b) => a.due.localeCompare(b.due));
}

export function formatDay(d: string): string {
  return `${parseInt(d.slice(8, 10), 10)} ${MONTHS[parseInt(d.slice(5, 7), 10) - 1]} ${d.slice(0, 4)}`;
}
