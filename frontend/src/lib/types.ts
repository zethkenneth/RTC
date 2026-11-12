export type EmployeeName = Pick<Employee, "id" | "first_name" | "middle_name" | "last_name" | "suffix">;

export interface Branch {
  id: number;
  branch_name: string;
  signatory_one: number | null;
  signatory_two: number | null;
  created_at: string;
  updated_at: string;
  signatory_one_employee: EmployeeName | null;
  signatory_two_employee: EmployeeName | null;
}

export type BranchInput = Pick<Branch, "branch_name" | "signatory_one" | "signatory_two">;

export interface Position {
  id: number;
  position_name: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: number;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null; // "Jr.", "III", ...
  branch_id: number;
  position_id: number;
  payroll_flag: boolean;
  date_hired: string | null; // "YYYY-MM-DD"
  date_retired: string | null; // "YYYY-MM-DD"
  retired_flag: boolean;
  created_at: string;
  updated_at: string;
  branch: Pick<Branch, "id" | "branch_name"> | null;
  position: Pick<Position, "id" | "position_name"> | null;
}

export type EmployeeInput = Pick<
  Employee,
  | "email"
  | "first_name"
  | "middle_name"
  | "last_name"
  | "suffix"
  | "branch_id"
  | "position_id"
  | "payroll_flag"
  | "date_hired"
  | "date_retired"
  | "retired_flag"
>;

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: ListMeta;
}
