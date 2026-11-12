-- Adds hire/retirement dates to employees. Used by the payroll report to work out
-- how many months of the quarter each employee is paid for.
-- Run this in the Supabase SQL editor. Safe to run more than once.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_hired   DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_retired DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS retired_flag BOOLEAN NOT NULL DEFAULT false;

-- A retired employee must have a retirement date.
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_retired_needs_date;
ALTER TABLE employees ADD CONSTRAINT employees_retired_needs_date
  CHECK (NOT retired_flag OR date_retired IS NOT NULL);

-- Retirement can't come before hiring.
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_retired_after_hired;
ALTER TABLE employees ADD CONSTRAINT employees_retired_after_hired
  CHECK (date_hired IS NULL OR date_retired IS NULL OR date_retired >= date_hired);
