// Quarter and month arithmetic for the payroll report.

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

export interface Coverage {
  months: number; // 0 when the employee isn't in service at all during the quarter
  period: string; // per-row label, e.g. "August-September 2026"
  amount: number; // months * MONTHLY_ALLOWANCE
}

/**
 * Months of the quarter the employee is paid for. The hire month and the
 * retirement month both count. A missing hire date means hired before the
 * quarter; a missing retirement date means still in service.
 */
export function coverage(q: Quarter, dateHired: string | null, dateRetired: string | null): Coverage {
  const range = quarterRange(q);
  const first = Math.max(range.first, dateHired ? isoToIndex(dateHired) : -Infinity);
  const last = Math.min(range.last, dateRetired ? isoToIndex(dateRetired) : Infinity);
  const months = Math.max(0, last - first + 1);
  if (months === 0) return { months: 0, period: "", amount: 0 };

  const a = MONTHS[fromIndex(first).month0];
  const b = MONTHS[fromIndex(last).month0];
  return {
    months,
    period: months === 1 ? `${a} ${q.year}` : `${a}-${b} ${q.year}`,
    amount: months * MONTHLY_ALLOWANCE,
  };
}

/** 2000 -> "2,000.00" */
export const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
