import type { EmployeeName } from "./types";

export const fullName = (e: EmployeeName) =>
  [e.first_name, e.middle_name, e.last_name, e.suffix].filter(Boolean).join(" ");
