import { z } from "zod";

const name = (max: number) => z.string().trim().min(1).max(max);
const fk = z.coerce.number().int().positive();

// --- Branches ---------------------------------------------------------------

// Each signatory is an employee id, or null to clear it.
const signatory = fk.nullable().optional();

const BranchFields = z.object({
  branch_name: name(255),
  signatory_one: signatory,
  signatory_two: signatory,
});

const distinctSignatories = (b: { signatory_one?: number | null; signatory_two?: number | null }) =>
  !(b.signatory_one != null && b.signatory_one === b.signatory_two);
const distinctMessage = {
  message: "Signatory one and two must be different employees",
  path: ["signatory_two"],
};

export const BranchCreate = BranchFields.refine(distinctSignatories, distinctMessage);
export const BranchUpdate = BranchFields.partial().refine(distinctSignatories, distinctMessage);

// --- Positions --------------------------------------------------------------

export const PositionCreate = z.object({ position_name: name(255) });
export const PositionUpdate = PositionCreate.partial();

// --- Employees --------------------------------------------------------------

// A calendar date as "YYYY-MM-DD" (Postgres DATE).
const date = z.iso.date();

const EmployeeFields = z.object({
  email: z.email().trim().toLowerCase().max(255),
  first_name: name(50),
  middle_name: name(50).nullish(),
  last_name: name(50),
  suffix: name(10).nullish(), // "Jr.", "III", ...
  position_id: fk,
  branch_id: fk,
  payroll_flag: z.boolean().optional(), // defaults to false in the database
  date_hired: date.nullish(),
  date_retired: date.nullish(),
  retired_flag: z.boolean().optional(), // defaults to false in the database
});

type ServiceDates = { date_hired?: string | null; date_retired?: string | null; retired_flag?: boolean };

// These only see fields sent in the same request; the database checks the rest.
const retiredHasDate = (e: ServiceDates) => !(e.retired_flag && !e.date_retired);
const retiredAfterHired = (e: ServiceDates) =>
  !(e.date_hired && e.date_retired && e.date_retired < e.date_hired); // ISO dates compare as text

const withDateRules = <T extends z.ZodType<ServiceDates>>(schema: T) =>
  schema
    .refine(retiredHasDate, { message: "Enter the retirement date", path: ["date_retired"] })
    .refine(retiredAfterHired, { message: "Retirement date can't be before the hire date", path: ["date_retired"] });

export const EmployeeCreate = withDateRules(EmployeeFields);
export const EmployeeUpdate = withDateRules(EmployeeFields.partial());

// --- List queries -----------------------------------------------------------

export const Pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const EmployeeQuery = Pagination.extend({
  branch_id: fk.optional(),
  position_id: fk.optional(),
  payroll_flag: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  retired_flag: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export const NameQuery = Pagination.extend({
  search: z.string().trim().min(1).max(100).optional(),
});
