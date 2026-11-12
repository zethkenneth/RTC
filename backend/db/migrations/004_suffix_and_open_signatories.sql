-- 1. Adds a name suffix (Jr., Sr., II, III, ...) to employees.
-- 2. Lets any employee be a branch signatory, not only employees assigned to that
--    branch (e.g. an Acting Presiding Judge who signs for two branches).
-- Run this in the Supabase SQL editor. Safe to run more than once.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS suffix VARCHAR(10);

-- Move a suffix typed at the end of the first name into the new column,
-- e.g. first_name "Carlos Jr." -> first_name "Carlos", suffix "Jr.".
UPDATE employees
SET suffix = CASE m[1] WHEN 'Jr' THEN 'Jr.' WHEN 'Sr' THEN 'Sr.' ELSE m[1] END,
    first_name = regexp_replace(first_name, '\s+(Jr\.?|Sr\.?|II|III|IV)$', '')
FROM (
  SELECT id, regexp_match(first_name, '\s(Jr\.?|Sr\.?|II|III|IV)$') AS m FROM employees
) s
WHERE employees.id = s.id AND s.m IS NOT NULL AND employees.suffix IS NULL;

-- Signatories: keep "two different people" and ON DELETE SET NULL,
-- drop the "must be assigned to this branch" rule and its clean-up trigger.
DROP TRIGGER IF EXISTS branches_check_signatories ON branches;
DROP FUNCTION IF EXISTS check_branch_signatories();
DROP TRIGGER IF EXISTS employees_clear_signatory ON employees;
DROP FUNCTION IF EXISTS clear_signatory_on_branch_change();
