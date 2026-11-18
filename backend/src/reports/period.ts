// Period and month arithmetic for the payroll report.

/** Pesos paid per month covered. */
export const MONTHLY_ALLOWANCE = 1000;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type QuarterNumber = 1 | 2 | 3 | 4;
export interface Quarter {
  year: number;
  quarter: QuarterNumber;
}

// Months are counted as year * 12 + (0-based month), so they compare and subtract easily.
const toIndex = (year: number, month0: number) => year * 12 + month0;
const fromIndex = (i: number) => ({ year: Math.floor(i / 12), month0: i % 12 });

/** "2026-08-15" -> month index. Reads the text directly to avoid time-zone shifts. */
const isoToIndex = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return toIndex(y, m - 1);
};

const quarterRange = ({ year, quarter }: Quarter) => {
  const first = toIndex(year, (quarter - 1) * 3);
  return { first, last: first + 2 };
};

/** Q3 2026 -> "July to September 2026" (page header). */
export function quarterLabel(q: Quarter) {
  const { first, last } = quarterRange(q);
  return `${MONTHS[fromIndex(first).month0]} to ${MONTHS[fromIndex(last).month0]} ${q.year}`;
}

/** What a payroll is for: a calendar quarter's allowance, or a year's cash gift. */
export type PayrollPeriod =
  | ({ kind: "quarter" } & Quarter)
  | { kind: "cash_gift"; year: number; amount: number };

/** "July to September 2026" or "Cash Gift 2026" (page header, file name). */
export const periodLabel = (p: PayrollPeriod) => (p.kind === "cash_gift" ? `Cash Gift ${p.year}` : quarterLabel(p));

export interface Coverage {
  months: number; // 0 when the employee isn't in service at all during the period
  period: string; // per-row label, e.g. "August-September 2026"
  note: string; // e.g. "(appointed as of August 2026)"; empty when there is nothing to note
  amount: number; // pesos
}

const NOT_PAID: Coverage = { months: 0, period: "", note: "", amount: 0 };

const monthLabel = (i: number) => {
  const { year, month0 } = fromIndex(i);
  return `${MONTHS[month0]} ${year}`;
};

/**
 * Months of the range the employee is in service. The hire month and the
 * retirement month both count. A missing hire date means hired before the
 * range; a missing retirement date means still in service.
 */
function serviceWithin(range: { first: number; last: number }, dateHired: string | null, dateRetired: string | null) {
  const hired = dateHired ? isoToIndex(dateHired) : -Infinity;
  const retired = dateRetired ? isoToIndex(dateRetired) : Infinity;
  const first = Math.max(range.first, hired);
  const last = Math.min(range.last, retired);
  return { first, last, hired, retired, months: Math.max(0, last - first + 1) };
}

/** Months of the quarter the employee is paid for, noting a hire or retirement in the quarter. */
export function coverage(q: Quarter, dateHired: string | null, dateRetired: string | null): Coverage {
  const range = quarterRange(q);
  const { first, last, hired, retired, months } = serviceWithin(range, dateHired, dateRetired);
  if (months === 0) return NOT_PAID;

  const inQuarter = (i: number) => i >= range.first && i <= range.last;
  const notes = [
    ...(inQuarter(hired) ? [`appointed as of ${monthLabel(hired)}`] : []),
    ...(inQuarter(retired) ? [`retired as of ${monthLabel(retired)}`] : []),
  ];

  const a = MONTHS[fromIndex(first).month0];
  const b = MONTHS[fromIndex(last).month0];
  return {
    months,
    period: months === 1 ? `${a} ${q.year}` : `${a}-${b} ${q.year}`,
    note: notes.length ? `(${notes.join("; ")})` : "",
    amount: months * MONTHLY_ALLOWANCE,
  };
}

/**
 * What the employee receives for this payroll. A cash gift goes to anyone in
 * service in December of the year, so retiring before December rules it out.
 */
export function payFor(p: PayrollPeriod, dateHired: string | null, dateRetired: string | null): Coverage {
  if (p.kind === "quarter") return coverage(p, dateHired, dateRetired);
  const december = toIndex(p.year, 11);
  const { months } = serviceWithin({ first: december, last: december }, dateHired, dateRetired);
  return months === 0 ? NOT_PAID : { months, period: periodLabel(p), note: "", amount: p.amount };
}

/** 2000 -> "2,000.00" */
export const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
