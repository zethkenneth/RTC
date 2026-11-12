-- Full schema for a fresh database. Run this in the Supabase SQL editor.
-- If you already ran an earlier version, run the files in db/migrations/ instead.
--
-- branches and employees reference each other (employees.branch_id and the branch
-- signatories), so branches is created first and the signatory columns are added
-- after employees exists (see 002_signatories_and_payroll.sql at the end).

CREATE TABLE IF NOT EXISTS branches (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_name VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS positions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  position_name VARCHAR(255) NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  first_name  VARCHAR(50)  NOT NULL,
  middle_name VARCHAR(50),
  last_name   VARCHAR(50)  NOT NULL,
  position_id BIGINT NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
  branch_id   BIGINT NOT NULL REFERENCES branches(id)  ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employees_branch_id_idx   ON employees(branch_id);
CREATE INDEX IF NOT EXISTS employees_position_id_idx ON employees(position_id);

-- Keep updated_at current on every UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branches_updated_at ON branches;
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS positions_updated_at ON positions;
CREATE TRIGGER positions_updated_at BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS employees_updated_at ON employees;
CREATE TRIGGER employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The Express backend uses the service role key, which bypasses RLS.
-- Enabling RLS with no policies blocks direct access with the public anon key.
ALTER TABLE branches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Signatories and payroll flag (db/migrations/002, minus the branch rule dropped in 004)
-- ---------------------------------------------------------------------------

ALTER TABLE employees ADD COLUMN IF NOT EXISTS payroll_flag BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS signatory_one BIGINT REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS signatory_two BIGINT REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS branches_signatory_one_idx ON branches(signatory_one);
CREATE INDEX IF NOT EXISTS branches_signatory_two_idx ON branches(signatory_two);

ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_signatories_distinct;
ALTER TABLE branches ADD CONSTRAINT branches_signatories_distinct
  CHECK (signatory_one IS NULL OR signatory_two IS NULL OR signatory_one <> signatory_two);

-- Any employee can be a signatory (see db/migrations/004_suffix_and_open_signatories.sql).

-- ---------------------------------------------------------------------------
-- Hire / retirement dates (same as db/migrations/003_employee_service_dates.sql)
-- ---------------------------------------------------------------------------

ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_hired   DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_retired DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS retired_flag BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_retired_needs_date;
ALTER TABLE employees ADD CONSTRAINT employees_retired_needs_date
  CHECK (NOT retired_flag OR date_retired IS NOT NULL);

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_retired_after_hired;
ALTER TABLE employees ADD CONSTRAINT employees_retired_after_hired
  CHECK (date_hired IS NULL OR date_retired IS NULL OR date_retired >= date_hired);

-- ---------------------------------------------------------------------------
-- Name suffix (same as db/migrations/004_suffix_and_open_signatories.sql)
-- ---------------------------------------------------------------------------

ALTER TABLE employees ADD COLUMN IF NOT EXISTS suffix VARCHAR(10);
