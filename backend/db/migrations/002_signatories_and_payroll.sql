-- Adds branch signatories and the employee payroll flag.
-- Run this in the Supabase SQL editor if you already ran the original schema.sql.
-- Safe to run more than once.

-- Employees: payroll flag
ALTER TABLE employees ADD COLUMN IF NOT EXISTS payroll_flag BOOLEAN NOT NULL DEFAULT false;

-- Branches: two optional signatories, each an employee.
-- If the employee is deleted, the signatory slot is cleared.
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS signatory_one BIGINT REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS signatory_two BIGINT REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS branches_signatory_one_idx ON branches(signatory_one);
CREATE INDEX IF NOT EXISTS branches_signatory_two_idx ON branches(signatory_two);

-- The two signatories must be different people.
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_signatories_distinct;
ALTER TABLE branches ADD CONSTRAINT branches_signatories_distinct
  CHECK (signatory_one IS NULL OR signatory_two IS NULL OR signatory_one <> signatory_two);

-- A signatory must be an employee assigned to that branch.
CREATE OR REPLACE FUNCTION check_branch_signatories() RETURNS trigger AS $$
BEGIN
  IF NEW.signatory_one IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM employees WHERE id = NEW.signatory_one AND branch_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Signatory one must be an employee assigned to this branch'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.signatory_two IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM employees WHERE id = NEW.signatory_two AND branch_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Signatory two must be an employee assigned to this branch'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branches_check_signatories ON branches;
CREATE TRIGGER branches_check_signatories
  BEFORE INSERT OR UPDATE OF signatory_one, signatory_two ON branches
  FOR EACH ROW EXECUTE FUNCTION check_branch_signatories();

-- When an employee moves to another branch, they stop being a signatory of the old one.
CREATE OR REPLACE FUNCTION clear_signatory_on_branch_change() RETURNS trigger AS $$
BEGIN
  UPDATE branches SET signatory_one = NULL WHERE id = OLD.branch_id AND signatory_one = OLD.id;
  UPDATE branches SET signatory_two = NULL WHERE id = OLD.branch_id AND signatory_two = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS employees_clear_signatory ON employees;
CREATE TRIGGER employees_clear_signatory
  AFTER UPDATE OF branch_id ON employees
  FOR EACH ROW WHEN (OLD.branch_id IS DISTINCT FROM NEW.branch_id)
  EXECUTE FUNCTION clear_signatory_on_branch_change();
