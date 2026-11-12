import { supabase } from "../lib/supabase.js";
import { fromPostgrest } from "../lib/errors.js";
import type { PayrollBranch, PayrollPayee, PayrollPerson } from "./payrollDocx.js";
import { coverage, type Quarter } from "./period.js";

type EmbeddedPosition = { position_name: string } | null;
type PersonRow = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  position: EmbeddedPosition;
};
type BranchRow = {
  id: number;
  branch_name: string;
  signatory_one_employee: PersonRow | null;
  signatory_two_employee: PersonRow | null;
};
type EmployeeRow = PersonRow & {
  branch_id: number;
  date_hired: string | null;
  date_retired: string | null;
  retired_flag: boolean;
};

const PERSON = "first_name, middle_name, last_name, suffix, position:positions(position_name)";
const PAGE_SIZE = 1000; // Supabase returns at most 1000 rows per request

const toPerson = (r: PersonRow): PayrollPerson => ({
  first_name: r.first_name,
  middle_name: r.middle_name,
  last_name: r.last_name,
  suffix: r.suffix,
  position_name: r.position?.position_name ?? null,
});

// Natural order, so "Branch 67" comes before "Branch 151".
const byName = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * Loads branches (with signatories) and their on-payroll employees, with the
 * months and amount each employee is paid for the quarter. Employees not in
 * service during the quarter (hired after it, or retired before it) are left out.
 */
export async function loadPayrollData(quarter: Quarter, branchIds?: number[]): Promise<PayrollBranch[]> {
  let bq = supabase
    .from("branches")
    .select(
      `id, branch_name,
       signatory_one_employee:employees!signatory_one(${PERSON}),
       signatory_two_employee:employees!signatory_two(${PERSON})`,
    );
  if (branchIds?.length) bq = bq.in("id", branchIds);
  const { data: branchData, error: branchError } = await bq;
  if (branchError) throw fromPostgrest(branchError);
  const branches = (branchData ?? []) as unknown as BranchRow[];

  // Page through all on-payroll employees.
  const employees: EmployeeRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let eq = supabase
      .from("employees")
      .select(`branch_id, date_hired, date_retired, retired_flag, ${PERSON}`)
      .eq("payroll_flag", true)
      .order("last_name")
      .order("first_name")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (branchIds?.length) eq = eq.in("branch_id", branchIds);
    const { data, error } = await eq;
    if (error) throw fromPostgrest(error);
    employees.push(...((data ?? []) as unknown as EmployeeRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const byBranch = new Map<number, PayrollPayee[]>();
  for (const e of employees) {
    // The retirement date only applies once the employee is marked retired.
    const paid = coverage(quarter, e.date_hired, e.retired_flag ? e.date_retired : null);
    if (paid.months === 0) continue;
    const list = byBranch.get(e.branch_id) ?? [];
    list.push({ ...toPerson(e), ...paid });
    byBranch.set(e.branch_id, list);
  }

  return branches
    .sort((a, b) => byName.compare(a.branch_name, b.branch_name))
    .map((b) => ({
      branch_name: b.branch_name,
      employees: byBranch.get(b.id) ?? [],
      signatory_one: b.signatory_one_employee ? toPerson(b.signatory_one_employee) : null,
      signatory_two: b.signatory_two_employee ? toPerson(b.signatory_two_employee) : null,
    }));
}
