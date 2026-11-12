-- Branch signatories from "List of RTC PJs, Officials and Personnel.docx".
-- In each section's footer, the first two signers are Signatory 1 and Signatory 2.
--
-- Run in the Supabase SQL editor AFTER 001_rtc_employees.sql and migration 004
-- (which lets one person sign for more than one branch). Safe to run more than once.
--
-- Notes:
-- * Signers who are not on the payroll list are added as employees with
--   payroll_flag = false (so they are not paid in the report), placeholder emails,
--   and their footer title as their position. Each is assigned to the first branch
--   they sign for.
-- * Signers who sign for more than one branch: Lucia Paula Corrales, Rosalie Arosa, Kathrine Go.
-- * Already on the payroll list, so reused as-is (their position stays as listed):
--   Irish Sheryl Llaneza.
-- * Middle names: the document gives full middle names for some judges
--   (e.g. "Mary Kwen Cañete Elefante"); those are stored in full.

BEGIN;

INSERT INTO positions (position_name) VALUES
  ('Acting Asst. Clerk of Court/Admin. Officer II'),
  ('Acting Presiding Judge'),
  ('Branch Clerk of Court V'),
  ('Clerk of Court VII'),
  ('Presiding Judge')
ON CONFLICT (position_name) DO NOTHING;

INSERT INTO employees
  (email, first_name, middle_name, last_name, suffix, position_id, branch_id, payroll_flag)
SELECT v.email, v.first_name, v.middle_name, v.last_name, v.suffix, p.id, b.id, false
FROM (VALUES
  ('luciapaula.corrales@rtc.invalid', 'Lucia Paula', 'V.', 'Corrales', NULL, 'Acting Asst. Clerk of Court/Admin. Officer II', 'RTC-OCC'),
  ('rosalie.arosa@rtc.invalid', 'Rosalie', 'C.', 'Arosa', NULL, 'Clerk of Court VII', 'RTC-OCC'),
  ('christianharvey.ducay@rtc.invalid', 'Christian Harvey', 'P.', 'Ducay', NULL, 'Branch Clerk of Court V', 'FAMILY COURT BRANCH 12'),
  ('marykwen.elefante@rtc.invalid', 'Mary Kwen', 'Cañete', 'Elefante', NULL, 'Presiding Judge', 'FAMILY COURT BRANCH 12'),
  ('christian.paralejas@rtc.invalid', 'Christian', 'L.', 'Paralejas', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 67'),
  ('irafritzie.cruzrojo@rtc.invalid', 'Ira Fritzie', 'C.', 'Cruz-Rojo', NULL, 'Presiding Judge', 'RTC-BRANCH 67'),
  ('omar.bagalacsa@rtc.invalid', 'Omar', 'V.', 'Bagalacsa', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 71'),
  ('elisa.sarmientoflores@rtc.invalid', 'Elisa', 'R.', 'Sarmiento-Flores', NULL, 'Presiding Judge', 'RTC-BRANCH 71'),
  ('ritatherese.santiagoraquel@rtc.invalid', 'Rita Therese', 'F.', 'Santiago-Raquel', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 151'),
  ('jennifer.escorpezobayaua@rtc.invalid', 'Jennifer', 'B.', 'Escorpezo-Bayaua', NULL, 'Presiding Judge', 'RTC-BRANCH 151'),
  ('mariejoyce.manongsong@rtc.invalid', 'Marie Joyce', 'P.', 'Manongsong', NULL, 'Presiding Judge', 'RTC-BRANCH 152'),
  ('hyuginicolae.sembrano@rtc.invalid', 'Hyugi Nicolae', 'C.', 'Sembrano', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 154'),
  ('achillesaristotleapolinario.bulauitan@rtc.invalid', 'Achilles Aristotle Apolinario', 'C.', 'Bulauitan', NULL, 'Presiding Judge', 'RTC-BRANCH 154'),
  ('rynbertanthony.maulion@rtc.invalid', 'Rynbert Anthony', 'L.', 'Maulion', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 155'),
  ('mariagracia.cadizcasaclang@rtc.invalid', 'Maria Gracia', 'A.', 'Cadiz-Casaclang', NULL, 'Presiding Judge', 'RTC-BRANCH 155'),
  ('rossanopietro.veloso@rtc.invalid', 'Rossano Pietro', 'T.', 'Veloso', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 157'),
  ('anateresa.cornejotomacruz@rtc.invalid', 'Ana Teresa', 'T.', 'Cornejo-Tomacruz', NULL, 'Presiding Judge', 'RTC-BRANCH 157'),
  ('reno.sunio@rtc.invalid', 'Reno', 'T.', 'Sunio', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 158'),
  ('manuelgerard.tomacruz@rtc.invalid', 'Manuel Gerard', 'C.', 'Tomacruz', NULL, 'Presiding Judge', 'RTC-BRANCH 158'),
  ('markanthony.bagual@rtc.invalid', 'Mark Anthony', 'F.', 'Bagual', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 159'),
  ('albertangelo.villalon@rtc.invalid', 'Albert Angelo', 'De Ramos', 'Villalon', NULL, 'Presiding Judge', 'RTC-BRANCH 159'),
  ('jobel.hernandez@rtc.invalid', 'Jobel', 'C.', 'Hernandez', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 161'),
  ('gabriel.villanueva@rtc.invalid', 'Gabriel', 'S.', 'Villanueva', NULL, 'Presiding Judge', 'RTC-BRANCH 161'),
  ('monica.david@rtc.invalid', 'Monica', 'A.', 'David', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 164'),
  ('jennifer.pilar@rtc.invalid', 'Jennifer', 'Albano', 'Pilar', NULL, 'Presiding Judge', 'RTC-BRANCH 164'),
  ('cheryle.dimaguila@rtc.invalid', 'Cheryle', 'L.', 'Dimaguila', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 166'),
  ('kathrine.go@rtc.invalid', 'Kathrine', 'A.', 'Go', NULL, 'Acting Presiding Judge', 'RTC-BRANCH 166'),
  ('vannakatrina.sansongalutera@rtc.invalid', 'Vanna Katrina', 'T.', 'Sanson-Galutera', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 167'),
  ('annielyn.medescabelis@rtc.invalid', 'Annielyn', 'B.', 'Medes-Cabelis', NULL, 'Presiding Judge', 'RTC-BRANCH 167'),
  ('dominicamon.ladeza@rtc.invalid', 'Dominic Amon', 'R.', 'Ladeza', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 261'),
  ('jesusangelito.huertas@rtc.invalid', 'Jesus Angelito', 'Y.', 'Huertas', 'Jr.', 'Presiding Judge', 'RTC-BRANCH 261'),
  ('czaralexis.rimando@rtc.invalid', 'Czar Alexis', 'D.', 'Rimando', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 265'),
  ('josephine.advento@rtc.invalid', 'Josephine', 'M.', 'Advento', NULL, 'Acting Presiding Judge', 'RTC-BRANCH 265'),
  ('nastasiaanne.padillaongleo@rtc.invalid', 'Nastasia Anne', 'C.', 'Padilla-Ongleo', NULL, 'Branch Clerk of Court V', 'RTC-BRANCH 268')
) AS v(email, first_name, middle_name, last_name, suffix, position_name, branch_name)
JOIN positions p ON p.position_name = v.position_name
JOIN branches  b ON b.branch_name  = v.branch_name
ON CONFLICT (email) DO NOTHING;

-- Signatory 1 and 2 per branch, looked up by name.
UPDATE branches AS b
SET signatory_one = (SELECT id FROM employees e WHERE e.first_name = v.first_one AND e.last_name = v.last_one ORDER BY id LIMIT 1),
    signatory_two = (SELECT id FROM employees e WHERE e.first_name = v.first_two AND e.last_name = v.last_two ORDER BY id LIMIT 1)
FROM (VALUES
  ('RTC-OCC', 'Lucia Paula', 'Corrales', 'Rosalie', 'Arosa'),
  ('RTC-MAINTENANCE', 'Lucia Paula', 'Corrales', 'Rosalie', 'Arosa'),
  ('FAMILY COURT BRANCH 12', 'Christian Harvey', 'Ducay', 'Mary Kwen', 'Elefante'),
  ('RTC-BRANCH 67', 'Christian', 'Paralejas', 'Ira Fritzie', 'Cruz-Rojo'),
  ('RTC-BRANCH 71', 'Omar', 'Bagalacsa', 'Elisa', 'Sarmiento-Flores'),
  ('RTC-BRANCH 151', 'Rita Therese', 'Santiago-Raquel', 'Jennifer', 'Escorpezo-Bayaua'),
  ('RTC-BRANCH 152', 'Irish Sheryl', 'Llaneza', 'Marie Joyce', 'Manongsong'),
  ('RTC-BRANCH 154', 'Hyugi Nicolae', 'Sembrano', 'Achilles Aristotle Apolinario', 'Bulauitan'),
  ('RTC-BRANCH 155', 'Rynbert Anthony', 'Maulion', 'Maria Gracia', 'Cadiz-Casaclang'),
  ('RTC-BRANCH 157', 'Rossano Pietro', 'Veloso', 'Ana Teresa', 'Cornejo-Tomacruz'),
  ('RTC-BRANCH 158', 'Reno', 'Sunio', 'Manuel Gerard', 'Tomacruz'),
  ('RTC-BRANCH 159', 'Mark Anthony', 'Bagual', 'Albert Angelo', 'Villalon'),
  ('RTC-BRANCH 161', 'Jobel', 'Hernandez', 'Gabriel', 'Villanueva'),
  ('RTC-BRANCH 164', 'Monica', 'David', 'Jennifer', 'Pilar'),
  ('RTC-BRANCH 166', 'Cheryle', 'Dimaguila', 'Kathrine', 'Go'),
  ('RTC-BRANCH 167', 'Vanna Katrina', 'Sanson-Galutera', 'Annielyn', 'Medes-Cabelis'),
  ('RTC-BRANCH 261', 'Dominic Amon', 'Ladeza', 'Jesus Angelito', 'Huertas'),
  ('RTC-BRANCH 265', 'Czar Alexis', 'Rimando', 'Josephine', 'Advento'),
  ('RTC-BRANCH 268', 'Nastasia Anne', 'Padilla-Ongleo', 'Kathrine', 'Go')
) AS v(branch_name, first_one, last_one, first_two, last_two)
WHERE b.branch_name = v.branch_name;

COMMIT;
